import { useFetcher } from 'react-router';
import { Trash2, Reply, Edit2, MoreVertical } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { useState, useRef, useEffect } from 'react';
import { CommentInput } from './comment-input';
import type { Comment, User } from '~/types/db';
import { censorText } from '~/lib/censor';

// Manual time ago function that works consistently on server and client
function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSecs < 60) return 'just now';
  if (diffMins === 1) return '1 minute ago';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  // For older dates, show actual date
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  const currentYear = now.getFullYear();
  
  if (year === currentYear) {
    return `${month} ${day}`;
  }
  return `${month} ${day}, ${year}`;
}

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
  if (!comment) return null;
  const deleteFetcher = useFetcher();
  const editFetcher = useFetcher();
  const repliesFetcher = useFetcher();
  const [isEditing, setIsEditing] = useState(false);
  const [showReplying, setShowReplying] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showAllReplies, setShowAllReplies] = useState(false);
  const [allReplies, setAllReplies] = useState<(Comment & { user: Pick<User, 'id' | 'displayName' | 'profilePhotoUrl'> })[]>([]);
  const [highlighted, setHighlighted] = useState(false);
  const highlightTimerRef = useRef<number | null>(null);

  // Seed initial replies if provided on the comment prop
  useEffect(() => {
    if (comment.replies && comment.replies.length > 0) {
      setAllReplies((prev) => {
        const combined = [...prev, ...(comment.replies as any)];
        const seen = new Set<string>();
        return combined.filter((r) => {
          if (seen.has(r.id)) return false;
          seen.add(r.id);
          return true;
        });
      });
    }
  }, [comment.replies]);
  const replyCount = (comment._count && typeof comment._count.replies === 'number') ? comment._count.replies : (comment.replies ? comment.replies.length : 0);
  const [editText, setEditText] = useState(comment.textContent);
  const menuRef = useRef<HTMLDivElement>(null);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);
  const isDeleting = deleteFetcher.state === 'submitting';
  const isSaving = editFetcher.state === 'submitting';
  const isAuthor = currentUserId === comment.userId;

  // Update replies when fetcher returns data
  useEffect(() => {
    if (repliesFetcher.data?.replies) {
      setAllReplies((prev) => {
        const combined = [...prev, ...repliesFetcher.data.replies];
        const seen = new Set<string>();
        const deduped: typeof combined = [];
        for (const r of combined) {
          if (!seen.has(r.id)) {
            seen.add(r.id);
            deduped.push(r);
          }
        }
        return deduped;
      });
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

  // Cleanup highlight timer
  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

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

    const formData = new FormData();
    formData.append('textContent', editText);

    editFetcher.submit(
      formData,
      {
        method: 'PUT',
        action: `/api/comments/${comment.id}/edit`,
      }
    );

    setIsEditing(false);
  };

  return (
    <div
      id={`comment-${comment.id}`}
      className={`py-3 ${highlighted ? 'ring-2 ring-accent/60 rounded-lg bg-accent/10' : ''}`}
      tabIndex={-1}
      onFocus={() => {
        setHighlighted(true);
        if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
        // remove highlight after 2.5s
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore setTimeout return type
        highlightTimerRef.current = window.setTimeout(() => setHighlighted(false), 2500);
      }}
      onBlur={() => {
        setHighlighted(false);
        if (highlightTimerRef.current) {
          clearTimeout(highlightTimerRef.current);
          highlightTimerRef.current = null;
        }
      }}
    >
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
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-primary">
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
                className="w-full p-2 border border-default rounded-lg bg-surface text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
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
              <div className="bg-secondary rounded-2xl px-3 py-2 relative">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-sm text-primary">{comment.user.displayName}</p>
                  <span className="text-xs text-muted">
                    {timeAgo(new Date(comment.createdAt))}
                  </span>
                </div>
                <p className="text-sm text-primary wrap-break-word">
                  {censorText(comment.textContent)}
                </p>

                {/* Long press menu for author */}
                {isAuthor && (
                  <div className="absolute top-2 right-2" ref={menuRef}>
                    <button
                      onClick={() => setShowMenu(!showMenu)}
                      className="p-1 hover:bg-surface rounded-full"
                    >
                      <MoreVertical className="w-4 h-4 text-muted" />
                    </button>
                    
                    {showMenu && (
                      <div className="absolute right-0 mt-1 w-32 bg-surface border border-default rounded-lg shadow-lg z-10">
                        <button
                          onClick={() => {
                            setIsEditing(true);
                            setShowMenu(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-secondary flex items-center gap-2"
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
                          className="w-full px-3 py-2 text-left text-sm text-destructive hover:bg-secondary flex items-center gap-2 disabled:opacity-50"
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
                  className="text-secondary hover:text-accent font-medium"
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
                  const combined = [...prev, data.comment];
                  const seen = new Set<string>();
                  const deduped: typeof combined = [];
                  for (const r of combined) {
                    if (!seen.has(r.id)) {
                      seen.add(r.id);
                      deduped.push(r);
                    }
                  }
                  console.log('[CommentItem] allReplies after:', deduped);
                  return deduped;
                });
              }
              setShowReplying(false);
            }}
            placeholder={`Reply to ${comment.user.displayName}...`}
          />
        </div>
      )}

      {/* Replies */}
      {(replyCount > 0) && (
        <div className="ml-11 mt-2 space-y-2">
          <button
            onClick={() => {
              if (!showAllReplies) {
                // load first page of replies
                repliesFetcher.load(`/api/comments/${comment.id}/replies?limit=5`);
              } else {
                // hide replies
                setShowAllReplies(false);
              }
            }}
            disabled={repliesFetcher.state === 'loading'}
            className="text-sm link-primary font-medium disabled:opacity-50"
          >
            {repliesFetcher.state === 'loading' ? 'Loading...' : (showAllReplies ? 'Hide replies' : `Show replies (${replyCount})`) }
          </button>

          {showAllReplies && allReplies.length > 0 && (
            <div className="space-y-2">
              {allReplies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  currentUserId={currentUserId}
                  postId={postId}
                  isPreview={isPreview}
                />
              ))}

              {/* Load more replies */}
              {isPreview && replyCount > allReplies.length && (
                <button
                  onClick={() => {
                    repliesFetcher.load(`/api/comments/${comment.id}/replies?skip=${allReplies.length}`);
                  }}
                  disabled={repliesFetcher.state === 'loading'}
                  className="text-sm link-primary font-medium disabled:opacity-50"
                >
                  {repliesFetcher.state === 'loading' 
                    ? 'Loading...' 
                    : `View ${replyCount - allReplies.length} more ${replyCount - allReplies.length === 1 ? 'reply' : 'replies'}`
                  }
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
