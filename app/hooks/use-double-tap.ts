import { useRef, useCallback } from 'react';

interface UseDoubleTapOptions {
  onDoubleTap: (x: number, y: number) => void;
  delayMs?: number;
}

export function useDoubleTap({ onDoubleTap, delayMs = 300 }: UseDoubleTapOptions) {
  const lastTapRef = useRef<number>(0);
  const lastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTap = useCallback((x?: number, y?: number) => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;

    if (timeSinceLastTap < delayMs) {
      // Double tap detected
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
      }
      onDoubleTap(lastPosRef.current.x, lastPosRef.current.y);
      lastTapRef.current = 0; // Reset to prevent triple tap
    } else {
      // First tap or too slow
      lastTapRef.current = now;
      if (x !== undefined && y !== undefined) {
        lastPosRef.current = { x, y };
      }

      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
      }

      tapTimeoutRef.current = setTimeout(() => {
        lastTapRef.current = 0;
      }, delayMs);
    }
  }, [delayMs, onDoubleTap]);

  return { handleTap };
}
