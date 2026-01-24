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
  isLoadingOlder?: boolean;
}

export function MessageThread({ messages, currentUserId, onLoadOlder, hasMore, isLoadingOlder }: MessageThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevScrollHeight = useRef<number>(0);
  const shouldScrollToBottom = useRef<boolean>(true);

  // Scroll to bottom only for new messages, not when loading older ones
  useEffect(() => {
    if (shouldScrollToBottom.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } else {
      // Maintain scroll position when loading older messages
      const container = messagesContainerRef.current;
      if (container) {
        const newScrollHeight = container.scrollHeight;
        const scrollDiff = newScrollHeight - prevScrollHeight.current;
        container.scrollTop = container.scrollTop + scrollDiff;
        prevScrollHeight.current = newScrollHeight;
      }
    }
    shouldScrollToBottom.current = true;
  }, [messages]);

  // Handle scroll to load older messages
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container || !onLoadOlder || !hasMore || isLoadingOlder) return;

    // Load older messages when scrolling near the top
    if (container.scrollTop < 200) {
      shouldScrollToBottom.current = false;
      prevScrollHeight.current = container.scrollHeight;
      onLoadOlder();
    }
  }, [onLoadOlder, hasMore, isLoadingOlder]);

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
          <div className="text-center py-4">
            {isLoadingOlder ? (
              <div className="flex items-center justify-center space-x-2 text-sm text-muted">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-default" style={{borderTopColor: 'var(--primary-color)'}}></div>
                <span>Loading older messages...</span>
              </div>
            ) : (
              <button
                onClick={onLoadOlder}
                className="link-primary text-sm font-medium"
              >
                Load older messages
              </button>
            )}
          </div>
        )}
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <div>
              <svg
                className="mx-auto h-12 w-12 text-muted"
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
              <p className="mt-4 text-sm text-muted">
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
