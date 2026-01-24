import { Share2 } from 'lucide-react';
import { Button } from '~/components/ui/button';

interface ShareButtonProps {
  onClick: () => void;
  shareCount?: number;
  className?: string;
}

export function ShareButton({ onClick, shareCount = 0, className = '' }: ShareButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={`flex items-center gap-2 text-secondary hover:text-primary ${className}`}
      aria-label="Share post"
    >
      <Share2 className="w-4 h-4" />
      <span className="text-sm font-medium">{shareCount}</span>
    </Button>
  );
}
