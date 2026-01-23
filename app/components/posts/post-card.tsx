import { useState, useEffect } from 'react';
import { useFetcher } from 'react-router';
import { Card, CardContent, CardHeader, CardMedia } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { CommentPreview, PostEngagementFooter, CommentThread, CommentInput } from './index';
import { DoubleTapHeart } from './double-tap-heart';
import { useSocket } from '~/hooks/use-socket';
import { useDoubleTap } from '~/hooks/use-double-tap';
import { useHapticFeedback } from '~/hooks/use-haptic-feedback';
import type { Comment, User } from '~/types/db';

interface PostCardProps {
  post: {
    id: string;
    textContent: string | null;
    mediaUrls: string[];
    createdAt: Date | string;
    likeCount: number;
    commentCount: number;
    shareCount?: number;
    isLikedByCurrentUser: boolean;
    user: {
      id: string;
      displayName: string;
      profilePhotoUrl: string | null;
    };
    comments?: (Comment & {
      user: Pick<User, 'id' | 'displayName' | 'profilePhotoUrl'>;
    })[];
  };
  currentUserId?: string;
  showActions?: boolean;
  showComments?: boolean;
  initialShowComments?: boolean;
}

export function PostCard({ post, currentUserId, showActions = true, showComments = true, initialShowComments = false }: PostCardProps) {
  const isOwnPost = currentUserId === post.user.id;
  const shareCount = post.shareCount || 0;
  const [showCommentThread, setShowCommentThread] = useState(initialShowComments);
  const [isLiked, setIsLiked] = useState(post.isLikedByCurrentUser);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [comments, setComments] = useState(post.comments || []);
  const [doubleTapHeart, setDoubleTapHeart] = useState({ visible: false, x: 0, y: 0 });
  const likeFetcher = useFetcher();
  const { socket } = useSocket();
  const { trigger: triggerHaptic } = useHapticFeedback();

  const handleDoubleTap = () => {
    if (!currentUserId) return;
    
    // Toggle like on double-tap (like if not liked, unlike if already liked)
    handleLike();
    // Provide haptic feedback
    triggerHaptic('doubleTap');
  };

  const handleDoubleTapWithHeart = (x: number, y: number) => {
    // Show the heart at tap position
    setDoubleTapHeart({
      visible: true,
      x,
      y,
    });
    // Reset after animation completes
    setTimeout(() => {
      setDoubleTapHeart({ visible: false, x: 0, y: 0 });
    }, 600);
    
    // Perform the like action
    handleDoubleTap();
  };

  const { handleTap: handleMediaTap } = useDoubleTap({
    onDoubleTap: handleDoubleTapWithHeart,
    delayMs: 300,
  });

  // Sync state with props when they change (except during optimistic updates)
  useEffect(() => {
    if (likeFetcher.state === 'idle') {
      setIsLiked(post.isLikedByCurrentUser);
      setLikeCount(post.likeCount);
    }
  }, [post.isLikedByCurrentUser, post.likeCount, likeFetcher.state]);

  useEffect(() => {
    setCommentCount(post.commentCount);
    setComments(post.comments || []);
  }, [post.commentCount, post.comments]);

  // Handle like fetcher completion
  useEffect(() => {
    if (likeFetcher.state === 'idle' && likeFetcher.data) {
      // Server response confirms the action, update if needed
      const serverLiked = likeFetcher.data.liked;
      if (serverLiked !== isLiked) {
        setIsLiked(serverLiked);
      }
    }
  }, [likeFetcher.state, likeFetcher.data, isLiked]);

  // Real-time comment updates
  useEffect(() => {
    if (!socket) {
      console.log('[PostCard] No socket available');
      return;
    }

    console.log('[PostCard] Joining post:', post.id);
    socket.emit('post:join', { postId: post.id });

    const handleNewComment = (data: any) => {
      console.log('[PostCard] Received comment:new', data);
      if (data.postId === post.id) {
        // Check if comment already exists (prevent duplicates from optimistic update)
        const exists = comments.some(c => c.id === data.comment.id);
        if (exists) {
          console.log('[PostCard] Comment already exists, skipping');
          return;
        }
        
        // Add to comments if it's a top-level comment
        if (!data.comment.parentCommentId && !showCommentThread) {
          setComments(prev => [...prev, data.comment]);
          setCommentCount(prev => prev + 1);
        }
      }
    };

    const handleDeletedComment = (data: any) => {
      console.log('[PostCard] Received comment:deleted', data);
      if (data.postId === post.id) {
        // Decrement comment count (backend handles total count including replies)
        setCommentCount(prev => Math.max(0, prev - 1));
        
        // Remove from preview
        setComments(prev => prev.filter(c => c.id !== data.commentId));
      }
    };

    socket.on('comment:new', handleNewComment);
    socket.on('comment:deleted', handleDeletedComment);

    const handleLikeUpdate = (data: any) => {
      if (data.postId === post.id) {
        setLikeCount(data.likeCount);
      }
    };

    socket.on('post:like', handleLikeUpdate);

    return () => {
      console.log('[PostCard] Leaving post:', post.id);
      socket.off('comment:new', handleNewComment);
      socket.off('comment:deleted', handleDeletedComment);
      socket.off('post:like', handleLikeUpdate);
      socket.emit('post:leave', { postId: post.id });
    };
  }, [socket, post.id, showCommentThread]);

  const handleLike = () => {
    // Optimistic update
    setIsLiked(!isLiked);
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);

    // Submit like action
    likeFetcher.submit(
      {},
      {
        method: 'POST',
        action: `/api/posts/${post.id}/like`,
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {post.user.profilePhotoUrl ? (
              <img
                src={post.user.profilePhotoUrl}
                alt={post.user.displayName}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                {post.user.displayName[0].toUpperCase()}
              </div>
            )}
            <div>
              <a
                href={`/users/${post.user.displayName}`}
                className="font-semibold hover:underline dark:text-white"
              >
                {post.user.displayName}
              </a>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {new Date(post.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
          {isOwnPost && showActions && (
            <form method="post" action={`/api/posts/${post.id}/delete`}>
              <Button variant="destructive" size="sm" type="submit">
                Delete
              </Button>
            </form>
          )}
        </div>
      </CardHeader>
      <CardMedia>
          {post.mediaUrls.length > 0 && (
            <div className={`grid gap-2 relative ${
                post.mediaUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
            }`}>
            {post.mediaUrls.map((url, index) => {
                const isVideo = url.includes('.mp4') || url.includes('.mov') || url.includes('video');
                
                if (isVideo) {
                    return (
                        <video
                        key={index}
                        src={url}
                        controls
                        className="w-full"
                        />
                    );
                }
                
                return (
                    <div
                    key={index}
                    onTouchEnd={(e) => {
                      const touch = e.changedTouches[0];
                      handleMediaTap(touch.clientX, touch.clientY);
                    }}
                    className="cursor-pointer"
                    >
                      <img
                        src={url}
                        alt={`Post media ${index + 1}`}
                        className="w-full object-cover aspect-square"
                      />
                    </div>
                );
            })}
          </div>
        )}
      </CardMedia>
      <DoubleTapHeart
        isVisible={doubleTapHeart.visible}
        x={doubleTapHeart.x}
        y={doubleTapHeart.y}
      />
      <CardContent>
        {post.textContent && (
          <p className="whitespace-pre-wrap dark:text-gray-100 mb-4">
            {post.textContent}
          </p>
        )}

        {/* Engagement Footer */}
        {showActions && (
          <PostEngagementFooter
            postId={post.id}
            likeCount={likeCount}
            commentCount={commentCount}
            shareCount={shareCount}
            isLiked={isLiked}
            onCommentClick={() => setShowCommentThread(!showCommentThread)}
            onLikeClick={handleLike}
          />
        )}

        {/* Comments Section - Expanded on demand */}
        {showComments && showCommentThread && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            {/* Comments List */}
            {comments && comments.length > 0 ? (
              <CommentThread
                postId={post.id}
                comments={comments}
                currentUserId={currentUserId}
                hasMore={commentCount > comments.length}
              />
            ) : (
              <>
                {currentUserId && (
                  <div className="mb-4">
                    <CommentInput 
                      postId={post.id}
                      onSuccess={(data) => {
                        if (data?.comment) {
                          // Optimistically add comment at bottom
                          setComments(prev => [...prev, data.comment]);
                          setCommentCount(prev => prev + 1);
                        }
                      }}
                    />
                  </div>
                )}
                {commentCount > 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Loading comments...</p>
                )}
              </>
            )}
          </div>
        )}

        {/* Comments Preview - Collapsed view */}
        {showComments && !showCommentThread && comments && comments.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold mb-3">Comments</h3>
            <CommentPreview
              postId={post.id}
              comments={comments.slice(-3)}
              currentUserId={currentUserId}
              totalCommentCount={commentCount}
              onViewMore={() => setShowCommentThread(true)}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
