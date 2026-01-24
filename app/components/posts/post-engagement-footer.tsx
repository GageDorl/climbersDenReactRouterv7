import { Heart, MessageCircle, Share2 } from 'lucide-react';

interface PostEngagementFooterProps {
  postId: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  isLiked?: boolean;
  onLikeClick?: () => void;
  onCommentClick?: () => void;
  onShareClick?: () => void;
}

export function PostEngagementFooter({
  postId,
  likeCount,
  commentCount,
  shareCount,
  isLiked = false,
  onLikeClick,
  onCommentClick,
  onShareClick,
}: PostEngagementFooterProps) {
  return (
    <div className="border-t border-default pt-2 mt-3">
      <div className="flex justify-between">
        {/* Like Button */}
        <button
          onClick={onLikeClick}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-secondary transition-colors ${
            isLiked ? 'text-destructive' : 'text-secondary'
          }`}
        >
          <Heart
            className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`}
          />
          <span className="text-sm font-medium">{likeCount}</span>
        </button>

        {/* Comment Button */}
        <button
          onClick={onCommentClick}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-secondary transition-colors text-secondary"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm font-medium">{commentCount}</span>
        </button>

        {/* Share Button */}
        <button
          onClick={onShareClick}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-secondary transition-colors text-secondary"
        >
          <Share2 className="w-5 h-5" />
          <span className="text-sm font-medium">{shareCount}</span>
        </button>
      </div>
    </div>
  );
}
