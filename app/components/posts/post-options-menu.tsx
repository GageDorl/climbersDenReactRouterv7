import { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Share2, Flag, Trash2 } from 'lucide-react';
import { Button } from '~/components/ui/button';

interface PostOptionsMenuProps {
  postId: string;
  onShare?: () => void;
  deleteAction?: string;
  canDelete?: boolean;
}

export function PostOptionsMenu({ postId, onShare, deleteAction, canDelete = false }: PostOptionsMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen(prev => !prev)}
        aria-label="Post options"
      >
        <MoreHorizontal className="w-5 h-5" />
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg border border-default bg-surface shadow-lg z-20">
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-secondary"
            onClick={() => {
              onShare?.();
              setOpen(false);
            }}
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
          <a
            href={`/report?postId=${postId}`}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-secondary"
            onClick={() => setOpen(false)}
          >
            <Flag className="w-4 h-4" />
            Report
          </a>
          {canDelete && deleteAction && (
            <form method="post" action={deleteAction}>
              <button
                type="submit"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-secondary"
                onClick={() => setOpen(false)}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
