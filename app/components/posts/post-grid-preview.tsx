import { Link } from 'react-router';
import { Heart, MessageCircle, Share2 } from 'lucide-react';

interface PostGridPreviewProps {
  postId: string;
  mediaUrl?: string;
  likeCount: number;
  commentCount: number;
  shareCount?: number;
}

export function PostGridPreview({ 
  postId, 
  mediaUrl, 
  likeCount, 
  commentCount, 
  shareCount = 0 
}: PostGridPreviewProps) {
  return (
    <Link 
      to={`/posts/${postId}`}
      className="group relative aspect-square overflow-hidden rounded-lg bg-secondary hover:shadow-lg transition-shadow"
    >
      {mediaUrl ? (
        <img
          src={mediaUrl}
          alt="Post preview"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-surface" />
      )}

      {/* Overlay with stats */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-6 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex flex-col items-center gap-1">
          <Heart className="w-6 h-6 text-white fill-white" />
          <span className="text-white font-semibold text-sm">{likeCount}</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <MessageCircle className="w-6 h-6 text-white" />
          <span className="text-white font-semibold text-sm">{commentCount}</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Share2 className="w-6 h-6 text-white" />
          <span className="text-white font-semibold text-sm">{shareCount}</span>
        </div>
      </div>
    </Link>
  );
}
