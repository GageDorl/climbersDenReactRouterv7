import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';
import { FollowButton } from '~/components/profile/follow-button';
import { ClickableProfilePicture } from '~/components/ui/clickable-profile-picture';

interface LikeUser {
  id: string;
  displayName: string;
  profilePhotoUrl: string | null;
  isFollowing?: boolean;
  isCurrentUser?: boolean;
}

interface LikesListModalProps {
  postId: string;
  likeCount: number;
  trigger?: ReactNode;
}

export function LikesListModal({ postId, likeCount, trigger }: LikesListModalProps) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<LikeUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && users.length === 0) {
      fetchLikes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, postId]);

  const fetchLikes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/posts/${postId}/likes`);
      if (!response.ok) {
        throw new Error('Failed to load likes');
      }
      const data = await response.json();
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load likes');
    } finally {
      setLoading(false);
    }
  };

  const title = useMemo(() => {
    if (likeCount === 0) return 'No likes yet';
    if (likeCount === 1) return 'Liked by 1 climber';
    return `Liked by ${likeCount} climbers`;
  }, [likeCount]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <button className="text-muted hover:text-accent transition-colors">
            {likeCount} {likeCount === 1 ? 'like' : 'likes'}
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="max-h-96 overflow-y-auto">
          {loading && (
            <p className="text-center text-muted py-4">
              Loading...
            </p>
          )}
          {error && (
            <p className="text-center text-destructive py-4">{error}</p>
          )}
          {!loading && !error && users.length === 0 && (
            <p className="text-center text-muted py-4">No likes yet</p>
          )}
          {!loading && !error && users.length > 0 && (
            <div className="space-y-3">
              {users.map(user => (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-secondary transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {user.profilePhotoUrl ? (
                      <ClickableProfilePicture
                        src={user.profilePhotoUrl}
                        alt={user.displayName}
                        size="md"
                        username={user.displayName}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-surface font-bold">
                        {user.displayName[0].toUpperCase()}
                      </div>
                    )}
                    <a
                      href={`/users/${user.id}`}
                      className="font-semibold text-primary truncate hover:underline"
                    >
                      {user.displayName}
                    </a>
                  </div>
                  {!user.isCurrentUser && (
                    <FollowButton
                      userId={user.id}
                      initialIsFollowing={Boolean(user.isFollowing)}
                      size="sm"
                      variant="secondary"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
