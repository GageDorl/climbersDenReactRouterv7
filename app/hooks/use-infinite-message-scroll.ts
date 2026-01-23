import { useEffect, useCallback, useRef } from 'react';
import { useFetcher } from 'react-router';

interface UseInfiniteMessageScrollProps {
  hasMore: boolean;
  conversationId: string;
  onLoadMore: (cursorId: string) => void;
}

export function useInfiniteMessageScroll({
  hasMore,
  conversationId,
  onLoadMore,
}: UseInfiniteMessageScrollProps) {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !hasMore) return;

    const handleScroll = () => {
      if (container.scrollTop < 100) {
        const firstMessageId = container.getAttribute('data-first-message-id');
        if (firstMessageId) {
          onLoadMore(firstMessageId);
        }
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, onLoadMore, conversationId]);

  return { messagesContainerRef, topRef };
}
