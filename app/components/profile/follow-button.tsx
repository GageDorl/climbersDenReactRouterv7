import { useFetcher } from 'react-router';
import { useEffect, useState } from 'react';
import { Button } from '~/components/ui/button';

interface FollowButtonProps {
  userId: string;
  initialIsFollowing: boolean;
  size?: 'default' | 'sm' | 'lg';
  variant?: 'default' | 'secondary';
}

export function FollowButton({
  userId,
  initialIsFollowing,
  size = 'default',
  variant = 'default',
}: FollowButtonProps) {
  const fetcher = useFetcher();
  const [optimisticFollowing, setOptimisticFollowing] = useState(initialIsFollowing);

  // Sync optimistic state with initial prop
  useEffect(() => {
    setOptimisticFollowing(initialIsFollowing);
  }, [initialIsFollowing]);

  // Update optimistic state based on fetcher submission
  useEffect(() => {
    if (fetcher.state === 'submitting') {
      // Toggle the current state optimistically
      setOptimisticFollowing(!optimisticFollowing);
    }
  }, [fetcher.state]);

  // Sync with actual response
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      const data = fetcher.data as { isFollowing?: boolean };
      if (typeof data.isFollowing === 'boolean') {
        setOptimisticFollowing(data.isFollowing);
      }
    }
  }, [fetcher.state, fetcher.data]);

  const isLoading = fetcher.state !== 'idle';
  const isFollowing = optimisticFollowing;

  const handleClick = () => {
    if (isLoading) return;

    // Submit with just action, let the server handle toggle
    fetcher.submit(
      {},
      {
        method: 'post',
        action: `/api/users/${userId}/follow`,
      }
    );
  };

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      variant={isFollowing ? 'secondary' : variant}
      size={size}
      className={isFollowing ? 'border-gray-300' : ''}
    >
      {isLoading ? (
        <>
          <span className="animate-spin mr-2">⏳</span>
          {isFollowing ? 'Unfollowing...' : 'Following...'}
        </>
      ) : isFollowing ? (
        'Following'
      ) : (
        'Follow'
      )}
    </Button>
  );
}
