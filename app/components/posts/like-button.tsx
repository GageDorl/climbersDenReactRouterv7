import { useFetcher } from 'react-router';
import { useEffect, useState } from 'react';

interface LikeButtonProps {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
}

export function LikeButton({ postId, initialLiked, initialCount }: LikeButtonProps) {
  const fetcher = useFetcher();
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialCount);

  // Optimistic UI update
  const handleLike = () => {
    // Optimistically update the UI
    setIsLiked(!isLiked);
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
    
    // Submit the form
    fetcher.submit(
      {},
      { method: 'post', action: `/api/posts/${postId}/like` }
    );
  };

  // Reset optimistic state if fetch fails
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.error) {
      setIsLiked(initialLiked);
      setLikeCount(initialCount);
    }
  }, [fetcher.state, fetcher.data, initialLiked, initialCount]);

  return (
    <button
      type="button"
      onClick={handleLike}
      disabled={fetcher.state !== 'idle'}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 ${
        isLiked
          ? 'badge-destructive'
          : 'bg-secondary text-secondary hover:bg-surface'
      }`}
    >
      <span className="text-lg">{isLiked ? '❤️' : '🤍'}</span>
      <span className="font-semibold">{likeCount}</span>
    </button>
  );
}
