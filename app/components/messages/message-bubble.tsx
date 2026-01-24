import { ImageModal, useImageModal } from '~/components/ui/image-modal';
import { VideoModal, useVideoModal } from '~/components/ui/video-modal';

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
  const { isOpen: isImageOpen, imageSrc, imageAlt, imageCaption, openModal: openImageModal, closeModal: closeImageModal } = useImageModal();
  const { isOpen: isVideoOpen, videoSrc, videoPoster, videoCaption, openModal: openVideoModal, closeModal: closeVideoModal } = useVideoModal();

  const handleImageClick = (url: string, index: number) => {
    const caption = `Message attachment ${index + 1} from ${message.sender.displayName}`;
    openImageModal(url, 'Message attachment', caption);
  };

  const handleVideoClick = (url: string, index: number) => {
    const caption = `Video message ${index + 1} from ${message.sender.displayName}`;
    openVideoModal(url, undefined, caption);
  };

  return (
    <>
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
                  <div key={index} className="relative group">
                    <video
                      src={url}
                      controls
                      className="max-h-60 w-full rounded cursor-pointer"
                      onClick={() => handleVideoClick(url, index)}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded transition-colors cursor-pointer" onClick={() => handleVideoClick(url, index)} />
                  </div>
                );
              }
              // Image
              return (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt="Message attachment"
                    className="max-h-60 w-full rounded object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => handleImageClick(url, index)}
                  />
                </div>
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
            const now = new Date();
            const isToday = date.toDateString() === now.toDateString();
            
            // Convert to 12-hour format
            let hours = date.getHours();
            const minutes = date.getMinutes().toString().padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12; // 0 should be 12
            const timeStr = `${hours}:${minutes} ${ampm}`;
            
            if (isToday) {
              return timeStr;
            } else {
              // Show date for messages not from today
              const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              const month = months[date.getMonth()];
              const day = date.getDate();
              const year = date.getFullYear();
              const currentYear = now.getFullYear();
              
              if (year === currentYear) {
                return `${month} ${day}, ${timeStr}`;
              } else {
                return `${month} ${day}, ${year} ${timeStr}`;
              }
            }
          })()}
        </p>
      </div>
    </div>
    
    {/* Media modals */}
    <ImageModal
      src={imageSrc}
      alt={imageAlt}
      isOpen={isImageOpen}
      onClose={closeImageModal}
      caption={imageCaption}
    />
    
    <VideoModal
      src={videoSrc}
      poster={videoPoster}
      isOpen={isVideoOpen}
      onClose={closeVideoModal}
      caption={videoCaption}
    />
  </>
  );
}
