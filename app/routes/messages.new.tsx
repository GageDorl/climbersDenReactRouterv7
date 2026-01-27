import { Form, Link, redirect, useLoaderData } from "react-router";
import type { Route } from "./+types/messages.new";
import { requireUserId } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { PageWrapper } from "~/components/ui/page-wrapper";
import { Input } from "~/components/ui/input";
import { useEffect, useRef, useState } from "react";

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await requireUserId(request);
  const url = new URL(request.url);
  const recipientUsername = url.searchParams.get("to");
  const query = url.searchParams.get("q") || "";
  const prefill = url.searchParams.get("prefill") || "";

  let recipientUser = null;
  let searchResults: any[] = [];

  if (recipientUsername) {
    recipientUser = await db.user.findUnique({
      where: { displayName: recipientUsername },
      select: {
        id: true,
        displayName: true,
        profilePhotoUrl: true,
      },
    });
  } else if (query.length >= 2) {
    searchResults = await db.user.findMany({
      where: {
        displayName: {
          contains: query,
          mode: 'insensitive',
        },
        NOT: {
          id: userId,
        },
      },
      select: {
        id: true,
        displayName: true,
        profilePhotoUrl: true,
      },
      take: 10,
    });
  }

  return { recipientUser, searchResults, query, prefill };
}

export async function action({ request }: Route.ActionArgs) {
  const userId = await requireUserId(request);
  const formData = await request.formData();

  const recipientIds = formData.getAll('recipientIds').map(String).filter(Boolean);
  const textContent = (formData.get('textContent') as string) || '';

  if (recipientIds.length === 0) {
    return { error: 'Please select at least one recipient' };
  }

  if (!textContent || textContent.trim().length === 0) {
    return { error: 'Message cannot be empty' };
  }

  if (textContent.length > 5000) {
    return { error: 'Message is too long (max 5000 characters)' };
  }

  // Remove self from recipients if present
  const recipients = recipientIds.filter(id => id !== userId);
  if (recipients.length === 0) {
    return { error: 'Cannot message yourself' };
  }

  if (recipients.length === 1) {
    // Single recipient - existing direct conversation flow
    const recipientId = recipients[0];

    const recipient = await db.user.findUnique({ where: { id: recipientId }, select: { id: true } });
    if (!recipient) return { error: 'Recipient not found' };

    const existingConversation = await db.conversation.findFirst({
      where: {
        AND: [
          { participantIds: { has: userId } },
          { participantIds: { has: recipientId } },
        ],
      },
    });

    let conversationId: string;
    if (existingConversation) {
      conversationId = existingConversation.id;
    } else {
      const newConversation = await db.conversation.create({ data: { participantIds: [userId, recipientId] } });
      conversationId = newConversation.id;
    }

    await db.message.create({ data: { conversationId, senderId: userId, recipientId, textContent: textContent.trim(), mediaUrls: [] } });
    await db.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } });

    return redirect(`/messages/${conversationId}`);
  }

  // Multiple recipients -> create GroupChat
  const uniqueParticipantIds = Array.from(new Set([userId, ...recipients]));

  const group = await db.groupChat.create({
    data: {
      creatorId: userId,
      participantIds: uniqueParticipantIds,
      name: `Group: ${uniqueParticipantIds.length} people`,
    },
  });

  // create participant rows
  await Promise.all(uniqueParticipantIds.map(async pid => {
    await db.groupChatParticipant.create({
      data: {
        groupChatId: group.id,
        participantId: pid,
        lastReadAt: pid === userId ? new Date() : null,
        muted: false,
      },
    });
  }));

  // create initial group message
  const message = await db.groupMessage.create({
    data: {
      groupChatId: group.id,
      senderId: userId,
      textContent: textContent.trim(),
      mediaUrls: [],
    },
  });

  await db.groupChat.update({ where: { id: group.id }, data: { lastMessageAt: new Date() } });

  return redirect(`/groups/${group.id}`);
}

export default function NewMessage() {
  const { recipientUser, searchResults, query, prefill } = useLoaderData<typeof loader>();
  const [selectedRecipients, setSelectedRecipients] = useState<any[]>(recipientUser ? [recipientUser] : []);
  const [queryState, setQueryState] = useState(query);
  const [clientResults, setClientResults] = useState<any[]>(searchResults);
  const [searching, setSearching] = useState(false);
  const lastQueryRef = useRef<string>('');
  const [textContent, setTextContent] = useState(prefill || "");
  const debounceRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Initialize lastQueryRef if loader provided an initial query/searchResults
  useEffect(() => {
    if (query && query.length >= 2 && searchResults && searchResults.length >= 0) {
      lastQueryRef.current = query;
    }
  }, []);

  // Prefer sessionStorage prefill if present (set by share modal)
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const s = sessionStorage.getItem('message_prefill');
        if (s && !textContent) {
          setTextContent(s);
          sessionStorage.removeItem('message_prefill');
        }
      }
    } catch (e) {
      // ignore sessionStorage errors
    }
  }, []);

  // Live-search users as queryState changes (debounced)
  useEffect(() => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    if (!queryState || queryState.length < 2) {
      setClientResults([]);
      setSearching(false);
      return;
    }

    debounceRef.current = window.setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      setSearching(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(queryState)}`, {
          signal: abortRef.current.signal,
        });
        if (!res.ok) {
          setSearching(false);
          return;
        }
        const data = await res.json();
        // Exclude already-selected recipients from the results
        const users = (data.users || []).filter((u: any) => !selectedRecipients.some((s: any) => s.id === u.id));
        setClientResults(users);
        // mark that we've searched for this query
        lastQueryRef.current = queryState;
        setSearching(false);
      } catch (err) {
        if ((err as any).name === 'AbortError') return;
        console.error('User search failed', err);
        setSearching(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [queryState, selectedRecipients]);

  return (
    <PageWrapper maxWidth="2xl">
      <div className="mx-auto max-w-2xl px-4">
        {/* Header */}
        <div className="mb-6 flex items-center space-x-4">
          <Link
            to="/messages"
            className="link-primary"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <h1 className="text-3xl font-bold text-primary">
            New Message
          </h1>
        </div>

        {/* Content */}
        <div className="rounded-lg bg-secondary p-6 shadow">
          {/* User Search */}
          <div className="mb-4">
            <label
              htmlFor="search"
              className="mb-2 block text-sm font-medium text-secondary"
            >
              Search for a user
            </label>
            <div>
              <Input
                type="text"
                name="q"
                id="search"
                value={queryState}
                onChange={(e) => setQueryState(e.target.value)}
                placeholder="Enter username..."
                className="w-full rounded-lg border border-default px-4 py-2 text-sm focus:outline-none focus:ring-2 dark:border-default dark:bg-surface dark:text-primary"
                autoComplete="off"
              />
            </div>
          </div>

          {/* Search Results */}
          {clientResults.length > 0 && (
            <div className="space-y-2 mb-4">
                  {clientResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => {
                        setSelectedRecipients(prev => prev.some(p => p.id === user.id) ? prev : [...prev, user]);
                        setQueryState('');
                        setClientResults((r) => r.filter((x) => x.id !== user.id));
                      }}
                      className="flex w-full items-center space-x-3 rounded-lg p-3 text-left hover:bg-surface dark:hover:bg-surface"
                    >
                  {user.profilePhotoUrl ? (
                    <img
                      src={user.profilePhotoUrl}
                      alt={user.displayName}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
                      {user.displayName[0].toUpperCase()}
                    </div>
                  )}
                  <span className="font-medium text-primary">
                    {user.displayName}
                  </span>
                </button>
              ))}
            </div>
          )}

          {queryState && !searching && clientResults.length === 0 && lastQueryRef.current === queryState && (
            <p className="text-center text-sm text-muted mb-4">
              No users found matching "{queryState}"
            </p>
          )}

          {!queryState && selectedRecipients.length === 0 && (
            <p className="text-center text-sm text-muted mb-4">
              Type at least 2 characters to search for users
            </p>
          )}

          {/* Selected Recipients */}
          {selectedRecipients.length > 0 && (
            <div className="mb-4 rounded-lg border border-default p-3 dark:border-default">
              <div className="mb-2 text-sm font-medium text-secondary">To:</div>
              <div className="flex flex-wrap gap-2">
                {selectedRecipients.map((r) => (
                  <div key={r.id} className="flex items-center space-x-2 rounded-full bg-surface px-3 py-1">
                    {r.profilePhotoUrl ? (
                      <img src={r.profilePhotoUrl} alt={r.displayName} className="h-6 w-6 rounded-full object-cover" />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center text-xs">{r.displayName[0].toUpperCase()}</div>
                    )}
                    <span className="text-sm font-medium text-primary">{r.displayName}</span>
                    <button onClick={() => setSelectedRecipients(prev => prev.filter(p => p.id !== r.id))} className="text-xs text-muted">✕</button>
                  </div>
                ))}
              </div>
              <div className="mt-2">
                <button onClick={() => setSelectedRecipients([])} className="text-sm text-secondary hover:text-primary">Clear</button>
              </div>
            </div>
          )}

          {/* Message Form */}
          {selectedRecipients.length > 0 && (
            <Form method="post">
              {selectedRecipients.map(r => (
                <input key={r.id} type="hidden" name="recipientIds" value={r.id} />
              ))}
              <div className="mb-4">
                <label
                  htmlFor="textContent"
                  className="mb-2 block text-sm font-medium text-secondary"
                >
                  Message
                </label>
                <textarea
                  name="textContent"
                  id="textContent"
                  rows={6}
                  placeholder="Type your message..."
                  className="w-full rounded-lg border border-default px-4 py-2 text-sm focus:outline-none focus:ring-2 dark:border-default dark:bg-surface dark:text-primary"
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end space-x-3">
                <Link
                  to="/messages"
                  className="rounded-lg border border-default px-4 py-2 text-sm font-medium text-secondary hover:bg-surface dark:border-default dark:text-secondary dark:hover:bg-surface"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  className="rounded-lg btn-primary px-4 py-2 text-sm font-medium"
                >
                  Send Message
                </button>
              </div>
            </Form>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
