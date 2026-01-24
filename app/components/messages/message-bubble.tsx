interface MessageBubbleProps {
  message: {
    id: string;
    textContent: string | null;
    mediaUrls: string[];
    sentAt: Date;
    sender: {
      id: string;
      displayName: string;
      profilePhotoUrl: string | null;
    };
  };
  isCurrentUser: boolean;
}

export function MessageBubble({ message, isCurrentUser }: MessageBubbleProps) {
  return (
    <div className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[70%] rounded-lg px-4 py-2 ${
          isCurrentUser
            ? "bg-blue-600 text-white"
            : "bg-white text-gray-900 shadow dark:bg-gray-800 dark:text-white"
        }`}
      >
        {/* Media attachments */}
        {message.mediaUrls.length > 0 && (
          <div className="mb-2 space-y-2">
            {message.mediaUrls.map((url, index) => {
              // Check if video
              if (url.includes('/video/') || url.match(/\.(mp4|webm|mov)$/i)) {
                return (
                  <video
                    key={index}
                    src={url}
                    controls
                    className="max-h-60 w-full rounded"
                  />
                );
              }
              // Image
              return (
                <img
                  key={index}
                  src={url}
                  alt="Message attachment"
                  className="max-h-60 w-full rounded object-cover"
                />
              );
            })}
          </div>
        )}

        {/* Text content */}
        {message.textContent && (
          <p className="whitespace-pre-wrap break-words text-sm">
            {message.textContent}
          </p>
        )}

        {/* Timestamp */}
        <p
          className={`mt-1 text-xs ${
            isCurrentUser ? "text-blue-100" : "text-gray-500 dark:text-gray-400"
          }`}
        >
          {(() => {
            const date = new Date(message.sentAt);
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            return `${hours}:${minutes}`;
          })()}
        </p>
      </div>
    </div>
  );
}
