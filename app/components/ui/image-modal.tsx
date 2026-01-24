import { useState } from 'react';
import { Dialog, DialogContent } from '~/components/ui/dialog';
import { X, Download, ExternalLink } from 'lucide-react';
import { Button } from '~/components/ui/button';

interface ImageModalProps {
  src: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
  caption?: string;
  showDownload?: boolean;
}

export function ImageModal({ 
  src, 
  alt, 
  isOpen, 
  onClose, 
  caption,
  showDownload = true 
}: ImageModalProps) {
  const [isLoading, setIsLoading] = useState(true);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = alt || 'image';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenInNewTab = () => {
    window.open(src, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black border-none">
        {/* Header with controls */}
        <div className="absolute top-4 right-12 z-10 flex gap-2">
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
          {/* Dialog already renders a close control; avoid duplicate X by not rendering another close here */}
        </div>

        {/* Image container */}
        <div className="flex items-center justify-center w-full h-full min-h-[400px] relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          )}
          
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-[90vh] object-contain"
            onLoad={() => setIsLoading(false)}
            onError={() => setIsLoading(false)}
          />
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
export function useImageModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [imageCaption, setImageCaption] = useState<string | undefined>();

  const openModal = (src: string, alt: string = '', caption?: string) => {
    setImageSrc(src);
    setImageAlt(alt);
    setImageCaption(caption);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setImageSrc('');
    setImageAlt('');
    setImageCaption(undefined);
  };

  return {
    isOpen,
    imageSrc,
    imageAlt,
    imageCaption,
    openModal,
    closeModal,
  };
}