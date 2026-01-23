import { useFetcher } from 'react-router';
import { formatDistanceToNow } from 'date-fns';
import { Trash2, Reply, Edit2, MoreVertical } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { useState, useRef, useEffect } from 'react';
import { CommentInput } from './comment-input';
import type { Comment, User } from '~/types/db';

interface CommentItemProps {
  comment: Comment & {
    user: Pick<User, 'id' | 'displayName' | 'profilePhotoUrl'>;
    replies?: (Comment & {
      user: Pick<User, 'id' | 'displayName' | 'profilePhotoUrl'>;
    })[];
    _count?: { replies: number };
  };
  currentUserId?: string;
  onReplyClick?: (commentId: string) => void;
  postId: string;
  isPreview?: boolean;
}

export function CommentItem({
  comment,
  currentUserId,
  onReplyClick,
  postId,
  isPreview = false,
}: CommentItemProps) {
  const deleteFetcher = useFetcher();
  const editFetcher = useFetcher();
  const repliesFetcher = useFetcher();
  const [isEditing, setIsEditing] = useState(false);
  const [showReplying, setShowReplying] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showAllReplies, setShowAllReplies] = useState(false);
  const [allReplies, setAllReplies] = useState(comment.replies || []);
  const [editText, setEditText] = useState(comment.textContent);
  const menuRef = useRef<HTMLDivElement>(null);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);
  const isDeleting = deleteFetcher.state === 'submitting';
  const isSaving = editFetcher.state === 'submitting';
  const isAuthor = currentUserId === comment.userId;

  // Update replies when fetcher returns data
  useEffect(() => {
    if (repliesFetcher.data?.replies) {
      setAllReplies([...allReplies, ...repliesFetcher.data.replies]);
      setShowAllReplies(true);
    }
  }, [repliesFetcher.data]);

  // Focus reply input when showing reply form
  useEffect(() => {
    if (showReplying && replyInputRef.current) {
      setTimeout(() => {
        replyInputRef.current?.focus();
      }, 0);
    }
  }, [showReplying]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const handleDelete = () => {
    if (confirm('Delete this comment?')) {
      deleteFetcher.submit(
        {},
        {
          method: 'DELETE',
          action: `/api/comments/${comment.id}/delete`,
        }
      );
    }
  };

  const handleSaveEdit = () => {
    if (editText.trim() === comment.textContent) {
      setIsEditing(false);
      return;
    }

    editFetcher.submit(
      { textContent: editText },
      {
        method: 'PUT',
        action: `/api/comments/${comment.id}/edit`,
        encType: 'application/json',
      }
    );

    setIsEditing(false);
  };

  return (
    <div className="py-3">
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="shrink-0">
          {comment.user.profilePhotoUrl ? (
            <img
              src={comment.user.profilePhotoUrl}
              alt={comment.user.displayName}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-semibold">
              {comment.user.displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Comment Content */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="text-xs"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setEditText(comment.textContent);
                  }}
                  className="text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-3 py-2 relative">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-sm">{comment.user.displayName}</p>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 wrap-break-word">
                  {comment.textContent}
                </p>

                {/* Long press menu for author */}
                {isAuthor && (
                  <div className="absolute top-2 right-2" ref={menuRef}>
                    <button
                      onClick={() => setShowMenu(!showMenu)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-500" />
                    </button>
                    
                    {showMenu && (
                      <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                        <button
                          onClick={() => {
                            setIsEditing(true);
                            setShowMenu(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                        >
                          <Edit2 className="w-3 h-3" />
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            handleDelete();
                            setShowMenu(false);
                          }}
                          disabled={isDeleting}
                          className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-1 ml-3 text-xs">
                <button
                  onClick={() => setShowReplying(!showReplying)}
                  className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
                >
                  Reply
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Reply Input */}
      {showReplying && currentUserId && (
        <div className="ml-11 mt-2">
          <CommentInput
            ref={replyInputRef}
            postId={postId}
            parentCommentId={comment.id}
            onSuccess={(data) => {
              console.log('[CommentItem] onSuccess data:', data);
              console.log('[CommentItem] allReplies before:', allReplies);
              if (data?.comment) {
                console.log('[CommentItem] Adding reply:', data.comment);
                setAllReplies((prev: typeof allReplies) => {
                  const updated = [...prev, data.comment];
                  console.log('[CommentItem] allReplies after:', updated);
                  return updated;
                });
              }
              setShowReplying(false);
            }}
            placeholder={`Reply to ${comment.user.displayName}...`}
          />
        </div>
      )}

      {/* Replies */}
      {allReplies && allReplies.length > 0 && (
        <div className="ml-11 mt-2 space-y-2">
          {allReplies.map((reply: Comment & { user: Pick<User, 'id' | 'displayName' | 'profilePhotoUrl'>; replies?: any[] }) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              postId={postId}
              isPreview={isPreview}
            />
          ))}
          
          {/* View More Replies Button */}
          {isPreview && comment._count && comment._count.replies > allReplies.length && (
            <button
              onClick={() => {
                repliesFetcher.load(`/api/comments/${comment.id}/replies?skip=${allReplies.length}`);
              }}
              disabled={repliesFetcher.state === 'loading'}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium disabled:opacity-50"
            >
              {repliesFetcher.state === 'loading' 
                ? 'Loading...' 
                : `View ${comment._count.replies - allReplies.length} more ${comment._count.replies - allReplies.length === 1 ? 'reply' : 'replies'}`
              }
            </button>
          )}
        </div>
      )}
    </div>
  );
}
