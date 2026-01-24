import { Link, useLoaderData } from "react-router";
import { useState, useEffect } from 'react';
import type { Route } from "./+types/messages._index";
import { requireUserId } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { PageWrapper } from "~/components/ui/page-wrapper";

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await requireUserId(request);

  // Get all conversations for the user with the last message
  const conversations = await db.conversation.findMany({
    where: {
      participantIds: {
        has: userId,
      },
    },
    include: {
      messages: {
        orderBy: { sentAt: 'desc' },
        take: 1,
        include: {
          sender: {
            select: {
              id: true,
              displayName: true,
              profilePhotoUrl: true,
            },
          },
        },
      },
    },
    orderBy: {
      lastMessageAt: 'desc',
    },
  });

  // Transform conversations to include other participant info and unread count
  const conversationsWithDetails = await Promise.all(
    conversations.map(async (conversation) => {
      const otherParticipantId = conversation.participantIds.find(
        (id) => id !== userId
      );

      const [otherParticipant, unreadCount] = await Promise.all([
        db.user.findUnique({
          where: { id: otherParticipantId },
          select: {
            id: true,
            displayName: true,
            profilePhotoUrl: true,
          },
        }),
        db.message.count({
          where: {
            conversationId: conversation.id,
            recipientId: userId,
            readAt: null,
          },
        }),
      ]);

      return {
        ...conversation,
        otherParticipant,
        unreadCount,
        lastMessage: conversation.messages[0] || null,
      };
    })
  );

  return { conversations: conversationsWithDetails, userId };
}

export default function MessagesIndex() {
  const { conversations, userId } = useLoaderData<typeof loader>();

  return (
    <PageWrapper maxWidth="4xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-primary">
            Messages
          </h1>
          <Link
            to="/messages/new"
            className="rounded-lg btn-primary px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2"
          >
            New Message
          </Link>
        </div>

        {/* Conversations List */}
        {conversations.length === 0 ? (
          <div className="rounded-lg bg-surface p-8 text-center shadow">
            <svg
              className="mx-auto h-12 w-12 text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-primary">
              No messages yet
            </h3>
            <p className="mt-2 text-sm text-secondary">
              Start a conversation to connect with other climbers
            </p>
            <Link
              to="/messages/new"
              className="mt-4 inline-block rounded-lg btn-primary px-4 py-2 text-sm font-medium"
            >
              Send a message
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conversation) => {
              if (!conversation.otherParticipant) return null;

              const lastMessage = conversation.lastMessage;
              const isFromCurrentUser = lastMessage?.senderId === userId;

              return (
                <Link
                  key={conversation.id}
                  to={`/messages/${conversation.id}`}
                  className="block rounded-lg bg-surface p-4 shadow transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start space-x-4">
                    {/* Avatar */}
                    <div className="shrink-0">
                      {conversation.otherParticipant.profilePhotoUrl ? (
                        <img
                          src={conversation.otherParticipant.profilePhotoUrl}
                          alt={conversation.otherParticipant.displayName}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full text-white" style={{backgroundColor: 'var(--primary-color)'}}>
                          {conversation.otherParticipant.displayName[0].toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-primary">
                          {conversation.otherParticipant.displayName}
                        </p>
                        {lastMessage && (
                          <p className="text-xs text-muted">
                            {(() => {
                              const date = new Date(lastMessage.sentAt);
                              const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                              const month = months[date.getMonth()];
                              const day = date.getDate();
                              const year = date.getFullYear();
                              return `${month} ${day}, ${year}`;
                            })()}
                          </p>
                        )}
                      </div>

                      {lastMessage && (
                        <ConversationPreview lastMessage={lastMessage} isFromCurrentUser={isFromCurrentUser} />
                      )}
                    </div>

                    {/* Unread Badge */}
                    {conversation.unreadCount > 0 && (
                      <div className="shrink-0">
                        <span className="inline-flex items-center justify-center rounded-full px-2 py-1 text-xs font-bold text-white" style={{backgroundColor: 'var(--primary-color)'}}>
                          {conversation.unreadCount}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
    </PageWrapper>
  );
}

function ConversationPreview({ lastMessage, isFromCurrentUser }: { lastMessage: any; isFromCurrentUser: boolean }) {
  const [isPostShare, setIsPostShare] = useState(false);
  const [postPreview, setPostPreview] = useState<any | null>(null);
  const [remainderText, setRemainderText] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (lastMessage?.textContent && lastMessage.textContent.startsWith('__POST_SHARE__:')) {
      const raw = lastMessage.textContent.slice('__POST_SHARE__:'.length);
      const postId = raw.split(/\s|\r|\n/)[0]?.trim();
      const remainder = raw.slice(postId ? postId.length : 0).trim();
      setRemainderText(remainder || null);
      if (!postId) return;
      setIsPostShare(true);
      (async () => {
        try {
          const res = await fetch(`/api/posts/${encodeURIComponent(postId)}/preview`, { headers: { Accept: 'application/json' } });
          if (!res.ok) return;
          const data = await res.json();
          if (mounted) setPostPreview(data);
        } catch (e) {
          // ignore
        }
      })();
    } else {
      setIsPostShare(false);
      setPostPreview(null);
      setRemainderText(null);
    }
    return () => { mounted = false; };
  }, [lastMessage?.textContent]);

  if (!isPostShare) {
    return (
      <p className="mt-1 text-sm text-secondary truncate">
        {isFromCurrentUser && "You: "}
        {lastMessage.textContent || (
          <span className="italic">Sent media</span>
        )}
      </p>
    );
  }

  if (postPreview) {
    return (
      <div className="mt-1 flex items-center space-x-2">
        {postPreview.mediaUrls && postPreview.mediaUrls[0] ? (
          <img src={postPreview.mediaUrls[0]} alt="preview" className="h-8 w-8 rounded object-cover" />
        ) : (
          <div className="h-8 w-8 rounded bg-gray-200 flex items-center justify-center text-xs text-muted">Post</div>
        )}
        <div className="truncate text-sm text-secondary">
          {isFromCurrentUser && "You: "}
          {postPreview.textContent ? postPreview.textContent : (postPreview.caption || 'View post')}
          {remainderText ? <span className="text-secondary"> — {remainderText}</span> : null}
        </div>
      </div>
    );
  }

  return (
    <p className="mt-1 text-sm text-secondary truncate">{isFromCurrentUser && "You: "}Shared post</p>
  );
}
