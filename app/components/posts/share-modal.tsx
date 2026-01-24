import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';
import { Copy, Link as LinkIcon, MessageCircle, Share2, Smartphone } from 'lucide-react';

interface ShareModalProps {
  postId: string;
  postTitle?: string;
  postAuthor?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShared?: (method: 'native' | 'copy' | 'messages') => void;
}

function buildShareUrl(postId: string) {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/posts/${postId}`;
  }
  return `/posts/${postId}`;
}

export function ShareModal({
  postId,
  postTitle,
  postAuthor,
  open,
  onOpenChange,
  onShared,
}: ShareModalProps) {
  const [activeTab, setActiveTab] = useState<'native' | 'messages' | 'copy'>('native');
  const [status, setStatus] = useState<string>('');
  const [isSharing, setIsSharing] = useState(false);

  const shareUrl = useMemo(() => buildShareUrl(postId), [postId]);
  const hasWebShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  useEffect(() => {
    if (!open) {
      setStatus('');
      setActiveTab('native');
    }
  }, [open]);

  const handleNativeShare = async () => {
    if (!hasWebShare) {
      setActiveTab('copy');
      setStatus('Native share is not available on this device. Use copy link instead.');
      return;
    }

    try {
      setIsSharing(true);
      await navigator.share({
        title: postTitle || 'Check out this post',
        text: postAuthor ? `${postAuthor} shared a post with you` : undefined,
        url: shareUrl,
      });
      setStatus('Shared successfully.');
      onShared?.('native');
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setStatus('Share dismissed.');
      } else {
        setStatus('Unable to share right now.');
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopy = async () => {
    try {
      setIsSharing(true);
      await navigator.clipboard.writeText(shareUrl);
      setStatus('Link copied to clipboard.');
      onShared?.('copy');
    } catch (error) {
      setStatus('Could not copy link.');
    } finally {
      setIsSharing(false);
    }
  };

  const navigate = useNavigate();

  const handleMessageShare = () => {
    // Store prefill in sessionStorage then navigate client-side to composer
    try {
      if (typeof window !== 'undefined') {
        const payload = JSON.stringify({ type: 'post_share', postId });
        sessionStorage.setItem('message_prefill', payload);
      }
    } catch (e) {
      // ignore sessionStorage errors
    }
    navigate('/messages');
    onShared?.('messages');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share this post</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <button
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${activeTab === 'native' ? 'border-accent text-primary' : 'border-default text-secondary'}`}
            onClick={() => setActiveTab('native')}
          >
            Native Share
          </button>
          <button
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${activeTab === 'messages' ? 'border-accent text-primary' : 'border-default text-secondary'}`}
            onClick={() => setActiveTab('messages')}
          >
            Share to Messages
          </button>
          <button
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${activeTab === 'copy' ? 'border-accent text-primary' : 'border-default text-secondary'}`}
            onClick={() => setActiveTab('copy')}
          >
            Copy Link
          </button>
        </div>

        {activeTab === 'native' && (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              Use your device share sheet to send this post directly.
            </p>
            <Button
              type="button"
              onClick={handleNativeShare}
              disabled={isSharing}
              className="w-full flex items-center justify-center gap-2"
            >
              <Smartphone className="w-4 h-4" />
              {hasWebShare ? 'Open share sheet' : 'Native share unavailable'}
            </Button>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              Open a message composer with the post link pre-filled.
            </p>
            <div>
              <Button type="button" onClick={handleMessageShare} className="w-full flex items-center justify-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Share via Messages
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'copy' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg border border-default px-3 py-2 bg-surface/60">
              <LinkIcon className="w-4 h-4 text-secondary" />
              <span className="text-sm truncate" title={shareUrl}>{shareUrl}</span>
            </div>
            <Button
              type="button"
              onClick={handleCopy}
              disabled={isSharing}
              className="w-full flex items-center justify-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy link
            </Button>
          </div>
        )}

        {status && (
          <p className="mt-4 text-sm text-secondary">{status}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
