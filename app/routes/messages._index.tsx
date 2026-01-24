import { Link, useLoaderData } from "react-router";
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Messages
          </h1>
          <Link
            to="/messages/new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            New Message
          </Link>
        </div>

        {/* Conversations List */}
        {conversations.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center shadow dark:bg-gray-800">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
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
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              No messages yet
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Start a conversation to connect with other climbers
            </p>
            <Link
              to="/messages/new"
              className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
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
                  className="block rounded-lg bg-white p-4 shadow transition-shadow hover:shadow-md dark:bg-gray-800"
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
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white">
                          {conversation.otherParticipant.displayName[0].toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {conversation.otherParticipant.displayName}
                        </p>
                        {lastMessage && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
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
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 truncate">
                          {isFromCurrentUser && "You: "}
                          {lastMessage.textContent || (
                            <span className="italic">Sent media</span>
                          )}
                        </p>
                      )}
                    </div>

                    {/* Unread Badge */}
                    {conversation.unreadCount > 0 && (
                      <div className="shrink-0">
                        <span className="inline-flex items-center justify-center rounded-full bg-blue-600 px-2 py-1 text-xs font-bold text-white">
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
