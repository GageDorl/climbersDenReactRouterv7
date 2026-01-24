import { useFetcher } from 'react-router';
import { useRef, useEffect, forwardRef } from 'react';
import { Button } from '~/components/ui/button';
import { Send } from 'lucide-react';

interface CommentInputProps {
  postId: string;
  parentCommentId?: string | null;
  onSuccess?: (comment?: any) => void;
  placeholder?: string;
}

export const CommentInput = forwardRef<HTMLTextAreaElement, CommentInputProps>(
  (
    {
      postId,
      parentCommentId,
      onSuccess,
      placeholder = 'Add a comment...',
    },
    ref,
  ) => {
    const fetcher = useFetcher();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const isSubmitting = fetcher.state === 'submitting';

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      // Clear the input after successful submission
      if (textareaRef.current) {
        textareaRef.current.value = '';
      }
      onSuccess?.(fetcher.data);
    }
  }, [fetcher.state, fetcher.data, onSuccess]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = textareaRef.current?.value.trim();

    if (!text) return;

    const formData = new FormData();
    formData.append('textContent', text);
    if (parentCommentId) {
      formData.append('parentCommentId', parentCommentId);
    }

    fetcher.submit(
      formData,
      {
        method: 'POST',
        action: `/api/posts/${postId}/comments/new`,
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (Ctrl+Enter or Cmd+Enter on Mac for multiline, just Enter on single line)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const form = e.currentTarget.closest('form');
      if (form) {
        form.dispatchEvent(new Event('submit', { bubbles: true }));
      }
    }
  };

  useEffect(() => {
    if (ref && 'current' in ref) {
      ref.current = textareaRef.current;
    }
  }, [ref]);

  return (
    <fetcher.Form onSubmit={handleSubmit} className="flex gap-2">
      <textarea
        ref={textareaRef}
        placeholder={placeholder}
        className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
        rows={2}
        disabled={isSubmitting}
        onKeyDown={handleKeyDown}
      />
      <Button
        type="submit"
        size="sm"
        disabled={isSubmitting}
        className="self-end"
      >
        {isSubmitting ? (
          <span className="text-xs">Sending...</span>
        ) : (
          <Send className="w-4 h-4" />
        )}
      </Button>
    </fetcher.Form>
  );
});

CommentInput.displayName = 'CommentInput';
