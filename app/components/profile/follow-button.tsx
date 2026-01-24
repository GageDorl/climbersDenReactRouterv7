import { useFetcher } from 'react-router';
import { useEffect, useState } from 'react';
import { Button } from '~/components/ui/button';

interface FollowButtonProps {
  userId: string;
  initialIsFollowing: boolean;
  size?: 'default' | 'sm' | 'lg';
  variant?: 'default' | 'secondary';
  isFollower?: boolean; // whether the other user is following the current user
}

export function FollowButton({
  userId,
  initialIsFollowing,
  size = 'default',
  variant = 'default',
  isFollower = false,
}: FollowButtonProps) {
  const fetcher = useFetcher();
  const [optimisticFollowing, setOptimisticFollowing] = useState(initialIsFollowing);
  const [pendingAction, setPendingAction] = useState<null | 'follow' | 'unfollow'>(null);

  // Sync optimistic state with initial prop
  useEffect(() => {
    setOptimisticFollowing(initialIsFollowing);
  }, [initialIsFollowing]);

  // Clear pending action when response arrives and sync with server
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      const data = fetcher.data as { isFollowing?: boolean };
      if (typeof data.isFollowing === 'boolean') {
        setOptimisticFollowing(data.isFollowing);
      }
      setPendingAction(null);
    }
  }, [fetcher.state, fetcher.data]);

  // Sync with actual response
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      const data = fetcher.data as { isFollowing?: boolean };
      if (typeof data.isFollowing === 'boolean') {
        setOptimisticFollowing(data.isFollowing);
      }
    }
  }, [fetcher.state, fetcher.data]);

  const isLoading = fetcher.state !== 'idle' && pendingAction !== null;
  const isFollowing = optimisticFollowing;

  const handleClick = () => {
    if (isLoading) return;

    // Determine action and optimistically update UI
    const action = isFollowing ? 'unfollow' : 'follow';
    setPendingAction(action as any);
    setOptimisticFollowing((s) => !s);

    // Submit with just action, let the server handle toggle
    fetcher.submit({}, { method: 'post', action: `/api/users/${userId}/follow` });
  };

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      variant={isFollowing ? 'secondary' : variant}
      size={size}
      className={isFollowing ? 'border-default' : ''}
    >
      {isLoading ? (
        <>
          <span className="animate-spin mr-2">⏳</span>
          {pendingAction === 'unfollow' ? 'Unfollowing...' : 'Following...'}
        </>
      ) : isFollowing ? (
        'Following'
      ) : (
        // Show "Follow back" when the other user follows you but you don't follow them
        isFollower ? 'Follow back' : 'Follow'
      )}
    </Button>
  );
}
