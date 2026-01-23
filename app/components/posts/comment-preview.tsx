import { CommentItem } from './comment-item';
import type { Comment, User } from '~/types/db';

interface CommentPreviewProps {
  postId: string;
  comments: (Comment & {
    user: Pick<User, 'id' | 'displayName' | 'profilePhotoUrl'>;
  })[];
  currentUserId?: string;
  totalCommentCount: number;
  onViewMore?: () => void;
}

export function CommentPreview({
  postId,
  comments,
  currentUserId,
  totalCommentCount,
  onViewMore,
}: CommentPreviewProps) {
  // Calculate total displayed comments (top-level + visible replies)
  const displayedCount = comments.reduce((total, comment) => {
    const repliesCount = comment.replies?.length || 0;
    return total + 1 + repliesCount; // 1 for the comment itself + its visible replies
  }, 0);
  
  const remainingComments = Math.max(0, totalCommentCount - displayedCount);

  return (
    <div className="space-y-2">
      {comments.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
          No comments yet. Be the first to comment!
        </p>
      ) : (
        <>
          {comments.map((comment) => (
            <div key={comment.id} className="text-sm">
              <CommentItem
                comment={comment}
                currentUserId={currentUserId}
                postId={postId}
                onReplyClick={() => {}}
                isPreview={true}
              />
            </div>
          ))}
          {remainingComments > 0 && onViewMore && (
            <button
              onClick={onViewMore}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              View {remainingComments} more {remainingComments === 1 ? 'comment' : 'comments'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
