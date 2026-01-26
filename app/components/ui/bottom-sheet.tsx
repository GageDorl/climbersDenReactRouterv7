import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const Portal = DialogPrimitive.Portal;

export function BottomSheet({ open, onOpenChange, children }: { open: boolean; onOpenChange: (v: boolean) => void; children: React.ReactNode }) {
  const [translateY, setTranslateY] = React.useState(0);
  const startYRef = React.useRef<number | null>(null);
  const sheetRef = React.useRef<HTMLDivElement | null>(null);
  const lastOpenedAtRef = React.useRef<number | null>(null);
  const prevBodyOverflowRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!open) setTranslateY(0);
    if (open) {
      lastOpenedAtRef.current = Date.now();
    }
    // Lock background scroll when sheet is open (mobile fix)
    try {
      if (open) {
        prevBodyOverflowRef.current = document.body.style.overflow || null;
        document.body.style.overflow = 'hidden';
      } else {
        if (prevBodyOverflowRef.current !== null) {
          document.body.style.overflow = prevBodyOverflowRef.current;
          prevBodyOverflowRef.current = null;
        } else {
          document.body.style.overflow = '';
        }
      }
    } catch (e) {
      // ignore (server-side rendering or unavailable document)
    }
  }, [open]);

  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startYRef.current == null) return;
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta > 0) {
      setTranslateY(delta);
    }
  };

  const handleTouchEnd = () => {
    if (translateY > (sheetRef.current?.clientHeight || 0) * 0.25) {
      onOpenChange(false);
    } else {
      setTranslateY(0);
    }
    startYRef.current = null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Portal>
        <div className="fixed inset-0 z-50 flex items-end sm:items-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              // Ignore accidental clicks that happen immediately after opening (e.g., mouseup lands on overlay)
              const openedAt = lastOpenedAtRef.current;
              if (openedAt && Date.now() - openedAt < 200) {
                return;
              }
              onOpenChange(false);
            }}
          />

          <div
            ref={sheetRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ transform: `translateY(${translateY}px)`, overscrollBehavior: 'contain', touchAction: 'pan-y' }}
            className="relative w-full bg-surface border-t border-default rounded-t-lg sm:rounded-lg sm:mx-auto sm:my-auto sm:max-w-xl sm:w-full"
          >
            <div className="w-12 h-0.5 bg-muted rounded-full mx-auto my-3"></div>
            <div className="p-4 max-h-[80vh] overflow-auto">{children}</div>
          </div>
        </div>
      </Portal>
    </Dialog>
  );
}

export { DialogTrigger };
