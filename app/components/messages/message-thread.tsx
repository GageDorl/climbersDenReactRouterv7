import { useEffect, useRef, useCallback } from "react";
import { MessageBubble } from "./message-bubble";

interface MessageThreadProps {
  messages: Array<{
    id: string;
    textContent: string | null;
    mediaUrls: string[];
    sentAt: Date;
    sender: {
      id: string;
      displayName: string;
      profilePhotoUrl: string | null;
    };
  }>;
  currentUserId: string;
  onLoadOlder?: () => void;
  hasMore?: boolean;
}

export function MessageThread({ messages, currentUserId, onLoadOlder, hasMore }: MessageThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle scroll to load older messages
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container || !onLoadOlder || !hasMore) return;

    if (container.scrollTop < 100) {
      onLoadOlder();
    }
  }, [onLoadOlder, hasMore]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-4xl space-y-4">
        {hasMore && (
          <button
            onClick={onLoadOlder}
            className="mx-auto block text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            Load older messages
          </button>
        )}
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <div>
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                No messages yet. Start the conversation!
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isCurrentUser={message.sender.id === currentUserId}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
