import { Link } from "react-router";
import { useEffect, useState } from "react";

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
  const [isPostShare, setIsPostShare] = useState(false);
  const [postPreview, setPostPreview] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;
    if (lastMessage?.textContent && lastMessage.textContent.startsWith('__POST_SHARE__:')) {
      const raw = lastMessage.textContent.slice('__POST_SHARE__:'.length);
      const postId = raw.split(/\s|\r|\n/)[0]?.trim();
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
    }
    return () => { mounted = false; };
  }, [lastMessage?.textContent]);

  return (
    <Link
      to={`/messages/${conversation.id}`}
      className="block rounded-lg bg-surface p-4 shadow transition-shadow hover:shadow-md"
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
            <div className="flex h-12 w-12 items-center justify-center rounded-full text-white bg-primary">
              {conversation.otherParticipant.displayName[0].toUpperCase()}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
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
            isPostShare ? (
              postPreview ? (
                <div className="mt-1 flex items-center space-x-2">
                  {postPreview.mediaUrls && postPreview.mediaUrls[0] ? (
                    <img src={postPreview.mediaUrls[0]} alt="preview" className="h-8 w-8 rounded object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded bg-gray-200 flex items-center justify-center text-xs text-muted">Post</div>
                  )}
                  <div className="truncate text-sm text-secondary line-clamp-2">
                    {isFromCurrentUser && "You: "}
                    {postPreview.textContent ? postPreview.textContent : (postPreview.caption || 'View post')}
                  </div>
                </div>
              ) : (
                <p className="mt-1 truncate text-sm text-secondary">{isFromCurrentUser && "You: "}Shared post</p>
              )
            ) : (
              <p className="mt-1 truncate text-sm text-secondary">
                {isFromCurrentUser && "You: "}
                {lastMessage.textContent || (
                  <span className="italic">Sent media</span>
                )}
              </p>
            )
          )}
        </div>

        {/* Unread Badge */}
        {conversation.unreadCount > 0 && (
          <div className="flex-shrink-0">
            <span className="inline-flex items-center justify-center rounded-full px-2 py-1 text-xs font-bold badge-primary">
              {conversation.unreadCount}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
