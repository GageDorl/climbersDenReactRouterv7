import { Link } from "react-router";

interface ConversationItemProps {
  conversation: {
    id: string;
    otherParticipant: {
      id: string;
      displayName: string;
      profilePhotoUrl: string | null;
    } | null;
    lastMessage: {
      id: string;
      textContent: string | null;
      mediaUrls: string[];
      sentAt: Date;
      senderId: string;
    } | null;
    unreadCount: number;
  };
  currentUserId: string;
}

export function ConversationItem({ conversation, currentUserId }: ConversationItemProps) {
  if (!conversation.otherParticipant) return null;

  const lastMessage = conversation.lastMessage;
  const isFromCurrentUser = lastMessage?.senderId === currentUserId;

  return (
    <Link
      to={`/messages/${conversation.id}`}
      className="block rounded-lg bg-white p-4 shadow transition-shadow hover:shadow-md dark:bg-gray-800"
    >
      <div className="flex items-start space-x-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
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
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {conversation.otherParticipant.displayName}
            </p>
            {lastMessage && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(lastMessage.sentAt).toLocaleDateString()}
              </p>
            )}
          </div>

          {lastMessage && (
            <p className="mt-1 truncate text-sm text-gray-600 dark:text-gray-300">
              {isFromCurrentUser && "You: "}
              {lastMessage.textContent || (
                <span className="italic">Sent media</span>
              )}
            </p>
          )}
        </div>

        {/* Unread Badge */}
        {conversation.unreadCount > 0 && (
          <div className="flex-shrink-0">
            <span className="inline-flex items-center justify-center rounded-full bg-blue-600 px-2 py-1 text-xs font-bold text-white">
              {conversation.unreadCount}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
