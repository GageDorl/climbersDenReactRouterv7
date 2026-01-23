import { useFetcher } from 'react-router';
import { useState, useRef, useEffect } from 'react';
import { CommentItem } from './comment-item';
import { CommentInput } from './comment-input';
import { Button } from '~/components/ui/button';
import { useSocket } from '~/hooks/use-socket';
import type { Comment, User } from '~/types/db';

interface CommentThreadProps {
  postId: string;
  comments: (Comment & {
    user: Pick<User, 'id' | 'displayName' | 'profilePhotoUrl'>;
    replies?: (Comment & {
      user: Pick<User, 'id' | 'displayName' | 'profilePhotoUrl'>;
    })[];
  })[];
  currentUserId?: string;
  hasMore: boolean;
  nextCursor?: string | null;
  totalCount?: number;
}

export function CommentThread({
  postId,
  comments: initialComments,
  currentUserId,
  hasMore: initialHasMore,
  nextCursor: initialNextCursor,
}: CommentThreadProps) {
  // Comments already come from loader in correct order (oldest first, newest at bottom)
  const [comments, setComments] = useState(initialComments);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const loadMoreFetcher = useFetcher();
  const observerTarget = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const { socket } = useSocket();

  // Real-time comment updates
  useEffect(() => {
    if (!socket) return;

    socket.emit('post:join', { postId });

    const handleNewComment = (data: any) => {
      console.log('[CommentThread] Received comment:new', data);
      if (data.postId === postId) {
        // Check if comment already exists (prevent duplicates from optimistic update)
        setComments((prev) => {
          const exists = prev.some(c => c.id === data.comment.id);
          if (exists) {
            console.log('[CommentThread] Comment already exists, skipping');
            return prev;
          }
          return [...prev, data.comment];
        });
      }
    };

    const handleDeletedComment = (data: any) => {
      if (data.postId === postId) {
        setComments((prev) => {
          // Recursively remove comment and its replies
          const removeComment = (comments: typeof prev, commentId: string): typeof prev => {
            return comments
              .filter((c) => c.id !== commentId)
              .map((c) => ({
                ...c,
                replies: c.replies ? removeComment(c.replies, commentId) : undefined,
              }));
          };
          return removeComment(prev, data.commentId);
        });
      }
    };

    const handleEditedComment = (data: any) => {
      if (data.postId === postId) {
        setComments((prev) => {
          // Recursively update comment
          const updateComment = (comments: typeof prev): typeof prev => {
            return comments.map((c) => {
              if (c.id === data.comment.id) {
                return { ...c, textContent: data.comment.textContent };
              }
              if (c.replies) {
                return { ...c, replies: updateComment(c.replies) };
              }
              return c;
            });
          };
          return updateComment(prev);
        });
      }
    };

    socket.on('comment:new', handleNewComment);
    socket.on('comment:deleted', handleDeletedComment);
    socket.on('comment:edited', handleEditedComment);

    return () => {
      socket.off('comment:new', handleNewComment);
      socket.off('comment:deleted', handleDeletedComment);
      socket.off('comment:edited', handleEditedComment);
      socket.emit('post:leave', { postId });
    };
  }, [socket, postId]);

  // Auto-focus comment input on mount
  useEffect(() => {
    if (commentInputRef.current) {
      setTimeout(() => commentInputRef.current?.focus(), 100);
    }
  }, []);

  // Fetch more comments when scrolling to bottom
  useEffect(() => {
    if (!observerTarget.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasMore && loadMoreFetcher.state === 'idle') {
        loadMoreFetcher.load(
          `/api/posts/${postId}/comments?limit=10&cursor=${nextCursor}`
        );
      }
    });

    observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [postId, hasMore, nextCursor, loadMoreFetcher]);

  // Add loaded comments
  useEffect(() => {
    if (
      loadMoreFetcher.state === 'idle' &&
      loadMoreFetcher.data?.comments
    ) {
      setComments((prev) => [...prev, ...loadMoreFetcher.data.comments]);
      setHasMore(loadMoreFetcher.data.hasMore);
      setNextCursor(loadMoreFetcher.data.nextCursor);
    }
  }, [loadMoreFetcher.data, loadMoreFetcher.state]);

  const handleNewComment = (data?: any) => {
    console.log('[CommentThread] handleNewComment called with:', data);
    // Add comment optimistically from CommentInput
    // Socket.IO listener will skip if already exists
    if (data?.comment) {
      console.log('[CommentThread] Adding optimistic comment:', data.comment.id, 'parentCommentId:', data.comment.parentCommentId);
      setComments((prev) => {
        const exists = prev.some(c => c.id === data.comment.id);
        if (exists) {
          console.log('[CommentThread] Comment already added optimistically');
          return prev;
        }
        return [...prev, data.comment];
      });
    } else {
      console.log('[CommentThread] No comment data provided');
    }
  };

  return (
    <div className="space-y-4">
      {/* Comment input */}
      <CommentInput
        ref={commentInputRef}
        postId={postId}
        onSuccess={handleNewComment}
        placeholder="Add a comment..."
      />

      {/* Comments list */}
      <div className="space-y-2">
        {comments.length === 0 ? (
          <p className="py-6 text-center text-gray-500 dark:text-gray-400">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              postId={postId}
            />
          ))
        )}
      </div>

      {/* Load more */}
      {hasMore && (
        <div ref={observerTarget} className="py-4 text-center">
          {loadMoreFetcher.state === 'loading' ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Loading more comments...
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                loadMoreFetcher.load(
                  `/api/posts/${postId}/comments?limit=10&cursor=${nextCursor}`
                )
              }
            >
              Load more comments
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
