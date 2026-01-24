import { Heart } from 'lucide-react';

interface DoubleTapHeartProps {
  isVisible: boolean;
  x?: number;
  y?: number;
}

// Define keyframes at module level to avoid duplication
const KEYFRAMES = `
  @keyframes heartBeat {
    0% {
      transform: translate(-50%, -50%) scale(0.5);
      opacity: 1;
    }
    100% {
      transform: translate(-50%, -50%) scale(2);
      opacity: 0;
    }
  }
`;

export function DoubleTapHeart({ isVisible, x = 0, y = 0 }: DoubleTapHeartProps) {
  if (!isVisible) return null;

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div
        key={`heart-${x}-${y}-${Date.now()}`}
        className="pointer-events-none fixed flex items-center justify-center"
        style={{
          left: `${x}px`,
          top: `${y}px`,
          animation: 'heartBeat 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        }}
      >
        <Heart
          className="w-16 h-16 text-destructive"
          style={{ fill: 'var(--destructive-color)' }}
          strokeWidth={1}
        />
      </div>
    </>
  );
}
