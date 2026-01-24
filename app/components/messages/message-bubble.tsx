import { ImageModal, useImageModal } from '~/components/ui/image-modal';
import { VideoModal, useVideoModal } from '~/components/ui/video-modal';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';

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
  const [isPostShare, setIsPostShare] = useState(false);
  const [postPreview, setPostPreview] = useState<any | null>(null);
  const [remainderText, setRemainderText] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (message.textContent && message.textContent.startsWith('__POST_SHARE__:')) {
      // sanitize post id (strip whitespace/newlines)
      const raw = message.textContent.slice('__POST_SHARE__:'.length);
      const postId = raw.split(/\s|\r|\n/)[0]?.trim();
      const remainder = raw.slice(postId ? postId.length : 0).trim();
      setRemainderText(remainder || null);
      if (!postId) {
        setIsPostShare(false);
        setPostPreview(null);
        return;
      }
      setIsPostShare(true);
      // fetch preview
      (async () => {
        try {
          const res = await fetch(`/api/posts/${encodeURIComponent(postId)}/preview`, {
            headers: { Accept: 'application/json' },
          });
          if (!res.ok) return;
          const data = await res.json();
          setPostPreview(data);
        } catch (e) {
          // ignore
        }
      })();
    } else {
      setIsPostShare(false);
      setPostPreview(null);
    }
  }, [message.textContent]);
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
            ? "bg-primary text-white shadow"
            : "bg-secondary text-primary shadow"
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

        {/* Special post preview */}
        {isPostShare ? (
          postPreview ? (
            <>
              <div
                role="button"
                onClick={() => navigate(`/posts/${postPreview.id}`)}
                className="cursor-pointer rounded border border-default p-3 bg-surface hover:shadow"
              >
                <div className="flex items-center space-x-3">
                  {postPreview.mediaUrls && postPreview.mediaUrls[0] ? (
                    <img src={postPreview.mediaUrls[0]} alt="Post preview" className="h-16 w-16 rounded object-cover" />
                  ) : (
                    <div className="h-16 w-16 rounded bg-gray-200 flex items-center justify-center text-sm text-muted">
                      {postPreview.caption ? postPreview.caption.slice(0, 40) : 'Post'}
                    </div>
                  )}
                  <div className="flex-1">
                  <p className="text-sm font-medium text-primary">{postPreview.user?.displayName || 'Shared post'}</p>
                  <p className="text-sm text-muted line-clamp-3">
                    {postPreview.textContent ? postPreview.textContent : (postPreview.caption || 'View post')}
                  </p>
                </div>
                </div>
              </div>
              {remainderText && (
                <p className="whitespace-pre-wrap break-words text-sm mt-2 line-clamp-2">{remainderText}</p>
              )}
            </>
          ) : (
            // Fallback clickable placeholder while loading or if preview fetch failed
            <div
              role="button"
                onClick={() => {
                const raw = message.textContent?.slice('__POST_SHARE__:'.length || 0);
                const pid = raw?.split(/\s|\r|\n/)[0]?.trim();
                if (pid) navigate(`/posts/${pid}`);
              }}
              className="cursor-pointer rounded border border-default p-3 bg-surface hover:shadow"
            >
              <div className="flex items-center space-x-3">
                <div className="h-12 w-12 flex items-center justify-center rounded bg-gray-200 text-sm text-muted">Post</div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-primary">Shared post</p>
                  <p className="text-sm text-muted truncate">View post</p>
                </div>
              </div>
            </div>
          )
        ) : (
          // Text content
          message.textContent && (
            <p className="whitespace-pre-wrap break-words text-sm">
              {message.textContent}
            </p>
          )
        )}

        {/* Timestamp */}
        <p className={`mt-1 text-xs text-muted ${isCurrentUser ? "text-white/70" : "text-primary/70"}`}>
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
