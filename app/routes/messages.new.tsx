import { Form, Link, redirect, useLoaderData } from "react-router";
import type { Route } from "./+types/messages.new";
import { requireUserId } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { PageWrapper } from "~/components/ui/page-wrapper";
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
  
  const recipientId = formData.get("recipientId") as string;
  const textContent = formData.get("textContent") as string;

  if (!recipientId) {
    return { error: "Please select a recipient" };
  }

  if (!textContent || textContent.trim().length === 0) {
    return { error: "Message cannot be empty" };
  }

  if (textContent.length > 5000) {
    return { error: "Message is too long (max 5000 characters)" };
  }

  // Check if recipient exists
  const recipient = await db.user.findUnique({
    where: { id: recipientId },
    select: { id: true },
  });

  if (!recipient) {
    return { error: "Recipient not found" };
  }

  // Check if conversation already exists between these users
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
    // Create new conversation
    const newConversation = await db.conversation.create({
      data: {
        participantIds: [userId, recipientId],
      },
    });
    conversationId = newConversation.id;
  }

  // Create message
  await db.message.create({
    data: {
      conversationId,
      senderId: userId,
      recipientId,
      textContent: textContent.trim(),
      mediaUrls: [],
    },
  });

  // Update conversation's lastMessageAt
  await db.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  });

  // TODO: Emit Socket.IO event for real-time delivery

  return redirect(`/messages/${conversationId}`);
}

export default function NewMessage() {
  const { recipientUser, searchResults, query, prefill } = useLoaderData<typeof loader>();
  const [selectedRecipient, setSelectedRecipient] = useState(recipientUser);
  const [queryState, setQueryState] = useState(query);
  const [clientResults, setClientResults] = useState<any[]>(searchResults);
  const [textContent, setTextContent] = useState(prefill || "");
  const debounceRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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
      return;
    }

    debounceRef.current = window.setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(queryState)}`, {
          signal: abortRef.current.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        setClientResults(data.users || []);
      } catch (err) {
        if ((err as any).name === 'AbortError') return;
        console.error('User search failed', err);
      }
    }, 250);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [queryState]);

  return (
    <PageWrapper maxWidth="2xl">
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black py-8">
        <div className="mx-auto max-w-2xl px-4">
        {/* Header */}
        <div className="mb-6 flex items-center space-x-4">
          <Link
            to="/messages"
            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            New Message
          </h1>
        </div>

        {/* Content */}
        <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          {!selectedRecipient ? (
            <>
              {/* User Search */}
              <div className="mb-4">
                <label
                  htmlFor="search"
                  className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Search for a user
                </label>
                <div>
                  <input
                    type="text"
                    name="q"
                    id="search"
                    value={queryState}
                    onChange={(e) => setQueryState(e.target.value)}
                    placeholder="Enter username..."
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    autoComplete="off"
                  />
                </div>
              </div>

              {/* Search Results */}
              {clientResults.length > 0 && (
                <div className="space-y-2">
                  {clientResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => setSelectedRecipient(user)}
                      className="flex w-full items-center space-x-3 rounded-lg p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {user.profilePhotoUrl ? (
                        <img
                          src={user.profilePhotoUrl}
                          alt={user.displayName}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 dark:bg-blue-700 text-white">
                          {user.displayName[0].toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium text-gray-900 dark:text-white">
                        {user.displayName}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {queryState && clientResults.length === 0 && (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                  No users found matching "{queryState}"
                </p>
              )}

              {!queryState && (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                  Type at least 2 characters to search for users
                </p>
              )}
            </>
          ) : (
            <>
              {/* Selected Recipient */}
              <div className="mb-4 flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    To:
                  </span>
                  {selectedRecipient.profilePhotoUrl ? (
                    <img
                      src={selectedRecipient.profilePhotoUrl}
                      alt={selectedRecipient.displayName}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm text-white">
                      {selectedRecipient.displayName[0].toUpperCase()}
                    </div>
                  )}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {selectedRecipient.displayName}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedRecipient(null)}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Change
                </button>
              </div>

              {/* Message Form */}
              <Form method="post">
                <input
                  type="hidden"
                  name="recipientId"
                  value={selectedRecipient.id}
                />
                <div className="mb-4">
                  <label
                    htmlFor="textContent"
                    className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Message
                  </label>
                  <textarea
                    name="textContent"
                    id="textContent"
                    rows={6}
                    placeholder="Type your message..."
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    required
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <Link
                    to="/messages"
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Send Message
                  </button>
                </div>
              </Form>
            </>
          )}
        </div>
        </div>
      </div>
    </PageWrapper>
  );
}
