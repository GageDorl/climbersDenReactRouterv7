import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';

interface User {
  id: string;
  displayName: string;
  profilePhotoUrl: string | null;
}

interface LikesListModalProps {
  postId: string;
  likeCount: number;
  trigger?: React.ReactNode;
}

export function LikesListModal({ postId, likeCount, trigger }: LikesListModalProps) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && users.length === 0) {
      fetchLikes();
    }
  }, [open]);

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <button className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            {likeCount} {likeCount === 1 ? 'like' : 'likes'}
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Liked by</DialogTitle>
        </DialogHeader>
        <div className="max-h-96 overflow-y-auto">
          {loading && (
            <p className="text-center text-gray-500 dark:text-gray-400 py-4">
              Loading...
            </p>
          )}
          {error && (
            <p className="text-center text-red-500 py-4">{error}</p>
          )}
          {!loading && !error && users.length === 0 && (
            <p className="text-center text-gray-500 dark:text-gray-400 py-4">
              No likes yet
            </p>
          )}
          {!loading && !error && users.length > 0 && (
            <div className="space-y-3">
              {users.map(user => (
                <a
                  key={user.id}
                  href={`/users/${user.displayName}`}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  {user.profilePhotoUrl ? (
                    <img
                      src={user.profilePhotoUrl}
                      alt={user.displayName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                      {user.displayName[0].toUpperCase()}
                    </div>
                  )}
                  <span className="font-semibold dark:text-white">
                    {user.displayName}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
