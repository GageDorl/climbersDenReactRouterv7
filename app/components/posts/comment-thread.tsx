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
  isOpen?: boolean;
}

export function CommentThread({
  postId,
  comments: initialComments,
  currentUserId,
  hasMore: initialHasMore,
  nextCursor: initialNextCursor,
  isOpen,
}: CommentThreadProps) {
  // Comments already come from loader in correct order (oldest first, newest at bottom)
  const [comments, setComments] = useState(initialComments);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const loadMoreFetcher = useFetcher();
  const observerTarget = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const { socket } = useSocket();
  const seenIdsRef = useRef<Set<string>>(new Set());
  const hasLoadedInitialRef = useRef(false);
  const lastRequestedCursorRef = useRef<string | null | undefined>(undefined);
  const prevIsOpenRef = useRef<boolean | undefined>(undefined);

  // Real-time comment updates
  useEffect(() => {
    if (!socket) return;

    socket.emit('post:join', { postId });

    const handleNewComment = (data: any) => {
      console.log('[CommentThread] Received comment:new', data);
      if (data.postId === postId) {
        // Check if comment already exists (prevent duplicates from optimistic update)
        const id = data.comment.id;
        if (seenIdsRef.current.has(id)) {
          console.log('[CommentThread] Comment already seen, skipping (socket)');
          return;
        }
        seenIdsRef.current.add(id);
        // If this is a reply, insert it under its parent comment recursively
        if (data.comment.parentCommentId) {
          const parentId = data.comment.parentCommentId as string;
          setComments((prev) => {
            const addReplyRec = (items: typeof prev): typeof prev => {
              return items.map((c) => {
                if (c.id === parentId) {
                  const existing = c.replies || [];
                  // avoid duplicate replies
                  if (existing.some(r => r.id === id)) return c;
                  return { ...c, replies: [...existing, data.comment] } as typeof c;
                }
                if (c.replies) {
                  return { ...c, replies: addReplyRec(c.replies) } as typeof c;
                }
                return c;
              });
            };
            return addReplyRec(prev);
          });
        } else {
          // Newest top-level comments are shown at the top
          setComments((prev) => [data.comment, ...prev]);
        }
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

  // If no initial comments were provided (e.g. opened via bottom sheet), load the first page
  useEffect(() => {
    if ((initialComments?.length || 0) === 0 && loadMoreFetcher.state === 'idle' && !hasLoadedInitialRef.current) {
      hasLoadedInitialRef.current = true;
      lastRequestedCursorRef.current = undefined;
      loadMoreFetcher.load(`/api/posts/${postId}/comments?limit=10`);
    }
  }, [initialComments, postId, loadMoreFetcher]);

  // Reload when the sheet is opened again
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      // opened now; ensure we fetch initial page if comments are empty
      if ((comments.length === 0 || (initialComments?.length || 0) === 0) && loadMoreFetcher.state === 'idle') {
        hasLoadedInitialRef.current = false;
        lastRequestedCursorRef.current = undefined;
        hasLoadedInitialRef.current = true;
        loadMoreFetcher.load(`/api/posts/${postId}/comments?limit=10`);
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, postId, loadMoreFetcher, comments.length, initialComments]);

  // Fetch more comments when scrolling to bottom
  useEffect(() => {
    if (!observerTarget.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      if (!hasMore) return;
      if (loadMoreFetcher.state !== 'idle') return;

      // Prevent requesting the same cursor repeatedly
      const cursorToRequest = nextCursor;
      if (lastRequestedCursorRef.current === cursorToRequest) return;
      lastRequestedCursorRef.current = cursorToRequest;

      loadMoreFetcher.load(
        `/api/posts/${postId}/comments?limit=10${cursorToRequest ? `&cursor=${cursorToRequest}` : ''}`
      );
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
      const fetched = loadMoreFetcher.data.comments || [];
      // Update hasMore/nextCursor immediately
      setHasMore(loadMoreFetcher.data.hasMore);
      setNextCursor(loadMoreFetcher.data.nextCursor);

      // If nothing was fetched, don't modify existing comments (avoid wiping)
      if (fetched.length === 0) return;

      setComments((prev) => {
        // If no existing comments, use fetched as source of truth and seed seen ids
        if (prev.length === 0) {
          for (const c of fetched) seenIdsRef.current.add(c.id);
          return [...fetched];
        }

        // Merge while preserving existing order and avoiding duplicates
        const map = new Map<string, typeof fetched[number]>();
        for (const c of prev) {
          map.set(c.id, c);
          seenIdsRef.current.add(c.id);
        }
        for (const c of fetched) {
          if (!map.has(c.id)) {
            map.set(c.id, c);
            seenIdsRef.current.add(c.id);
          }
        }
        return Array.from(map.values());
      });
      
    }
  }, [loadMoreFetcher.data, loadMoreFetcher.state]);

  const handleNewComment = (data?: any) => {
    console.log('[CommentThread] handleNewComment called with:', data);
    // Add comment optimistically from CommentInput
    // Socket.IO listener will skip if already exists
    if (data?.comment) {
      console.log('[CommentThread] Adding optimistic comment:', data.comment.id, 'parentCommentId:', data.comment.parentCommentId);
      const id = data.comment.id;
      if (seenIdsRef.current.has(id)) {
        console.log('[CommentThread] Comment already added optimistically (seen)');
        return;
      }
      seenIdsRef.current.add(id);
      setComments((prev) => {
        const exists = prev.some(c => c.id === id);
        if (exists) {
          console.log('[CommentThread] Comment already added optimistically');
          return prev;
        }
        // Prepend optimistic comment so newest appears at the top
        return [data.comment, ...prev];
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
          loadMoreFetcher.state === 'loading' ? (
            <p className="py-6 text-center text-muted">Loading comments...</p>
          ) : (
            <p className="py-6 text-center text-muted">No comments yet. Be the first to comment!</p>
          )
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
            <div className="text-sm text-muted">
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
