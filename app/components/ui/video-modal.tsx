import { useState, useRef } from 'react';
import { Dialog, DialogContent } from '~/components/ui/dialog';
import { X, Download, ExternalLink, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Button } from '~/components/ui/button';

interface VideoModalProps {
  src: string;
  poster?: string;
  isOpen: boolean;
  onClose: () => void;
  caption?: string;
  showDownload?: boolean;
}

export function VideoModal({ 
  src, 
  poster,
  isOpen, 
  onClose, 
  caption,
  showDownload = true 
}: VideoModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleMuteToggle = () => {
    if (!videoRef.current) return;
    
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = 'video';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenInNewTab = () => {
    window.open(src, '_blank');
  };

  const handleVideoLoad = () => {
    setIsLoading(false);
  };

  const handleVideoError = () => {
    setIsLoading(false);
  };

  // Reset video state when modal opens/closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setIsPlaying(false);
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black border-none">
        {/* Header with controls */}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          {showDownload && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownload}
                className="text-surface" style={{backgroundColor: 'rgba(0, 0, 0, 0.7)'}}
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleOpenInNewTab}
                className="text-surface" style={{backgroundColor: 'rgba(0, 0, 0, 0.7)'}}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleMuteToggle}
            className="text-surface" style={{backgroundColor: 'rgba(0, 0, 0, 0.7)'}}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleOpenChange(false)}
            className="text-surface" style={{backgroundColor: 'rgba(0, 0, 0, 0.7)'}}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Video container */}
        <div className="flex items-center justify-center w-full h-full min-h-[400px] relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          )}
          
          <video
            ref={videoRef}
            src={src}
            poster={poster}
            className="max-w-full max-h-[90vh] object-contain"
            onLoadedData={handleVideoLoad}
            onError={handleVideoError}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onClick={handlePlayPause}
            controls
          />

          {/* Play button overlay */}
          {!isPlaying && !isLoading && (
            <button
              onClick={handlePlayPause}
              className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/50 transition-colors"
            >
              <div className="bg-white/90 hover:bg-white rounded-full p-4 transition-colors">
                <Play className="w-8 h-8 text-black ml-1" />
              </div>
            </button>
          )}
        </div>

        {/* Caption */}
        {caption && (
          <div className="absolute bottom-4 left-4 right-4 bg-black/70 text-white p-3 rounded-lg text-center">
            <p className="text-sm">{caption}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Hook for easy usage
export function useVideoModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [videoSrc, setVideoSrc] = useState('');
  const [videoPoster, setVideoPoster] = useState<string | undefined>();
  const [videoCaption, setVideoCaption] = useState<string | undefined>();

  const openModal = (src: string, poster?: string, caption?: string) => {
    setVideoSrc(src);
    setVideoPoster(poster);
    setVideoCaption(caption);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setVideoSrc('');
    setVideoPoster(undefined);
    setVideoCaption(undefined);
  };

  return {
    isOpen,
    videoSrc,
    videoPoster,
    videoCaption,
    openModal,
    closeModal,
  };
}