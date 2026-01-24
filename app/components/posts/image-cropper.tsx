import { useState, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { Button } from '~/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '~/components/ui/dialog';
import { Label } from '~/components/ui/label';
import type { Area, Point } from 'react-easy-crop';

interface ImageCropperProps {
  imageSrc: string;
  open: boolean;
  onSave: (croppedImageUrl: string, croppedFile: File) => void;
  onCancel: () => void;
  aspectRatioOptions?: Array<{ label: string; value: number | undefined }>;
  defaultAspectRatio?: number;
}

export function ImageCropper({
  imageSrc,
  open,
  onSave,
  onCancel,
  aspectRatioOptions = [
    { label: '1:1 Square', value: 1 },
    { label: '4:3 Landscape', value: 4 / 3 },
    { label: '16:9 Wide', value: 16 / 9 },
    { label: 'Freeform', value: undefined },
  ],
  defaultAspectRatio = 1,
}: ImageCropperProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [aspectRatio, setAspectRatio] = useState<number | undefined>(defaultAspectRatio);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cropWidth, setCropWidth] = useState(300);
  const [cropHeight, setCropHeight] = useState(300);
  const [imageWidth, setImageWidth] = useState(0);
  const [imageHeight, setImageHeight] = useState(0);
  const [imageAspectRatio, setImageAspectRatio] = useState(1);

  // Helper function to calculate GCD
  const gcd = (a: number, b: number): number => {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b !== 0) {
      const temp = b;
      b = a % b;
      a = temp;
    }
    return a;
  };

  // Get image dimensions once when image loads
  useEffect(() => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      setImageWidth(img.width);
      setImageHeight(img.height);
      setImageAspectRatio(img.width / img.height);
      
      // Set initial crop size to 60% of image (only on first load)
      setCropWidth(Math.round(img.width * 0.6));
      setCropHeight(Math.round(img.height * 0.6));
    };
  }, [imageSrc]);

  const handleCropComplete = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (!croppedAreaPixels) return;

    setIsProcessing(true);
    try {
      // Create canvas from image
      const image = new Image();
      image.src = imageSrc;

      image.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          console.error('Could not get canvas context');
          return;
        }

        const { width, height, x, y } = croppedAreaPixels;
        canvas.width = width;
        canvas.height = height;

        // Draw cropped image on canvas
        ctx.drawImage(
          image,
          x,
          y,
          width,
          height,
          0,
          0,
          width,
          height
        );

        // Convert canvas to blob and create file
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `cropped-${Date.now()}.png`, {
              type: 'image/png',
            });

            // Create data URL for preview
            const croppedImageUrl = canvas.toDataURL('image/png');
            onSave(croppedImageUrl, file);
          }
          setIsProcessing(false);
        }, 'image/png');
      };
    } catch (error) {
      console.error('Error cropping image:', error);
      setIsProcessing(false);
    }
  }, [croppedAreaPixels, imageSrc, onSave]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crop Image</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Aspect Ratio Selector */}
          <div>
            <Label>Aspect Ratio</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
              {aspectRatioOptions.map((option) => (
                <button
                  key={option.label}
                  onClick={() => setAspectRatio(option.value)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    aspectRatio === option.value
                      ? 'btn-primary'
                      : 'bg-secondary text-primary hover:bg-surface'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cropper */}
          <div className="relative w-full h-80 rounded-md overflow-hidden" style={{backgroundColor: 'var(--text-primary)'}}>
            {(() => {
              // Calculate rendered image dimensions (image scaled to fit 320px height)
              const renderedHeight = 320;
              const renderedWidth = (imageWidth / imageHeight) * renderedHeight;
              
              // Cap crop box to rendered image size
              const maxCropWidth = Math.min(cropWidth, renderedWidth);
              const maxCropHeight = Math.min(cropHeight, renderedHeight);
              
              return (
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  {...(aspectRatio !== undefined ? { aspect: aspectRatio } : {})}
                  {...(aspectRatio === undefined ? { 
                    cropSize: { width: maxCropWidth, height: maxCropHeight } 
                  } : {})}
                  onCropChange={setCrop}
                  onCropComplete={handleCropComplete}
                  onZoomChange={setZoom}
                  restrictPosition={true}
                />
              );
            })()}
          </div>

          {/* Zoom Slider */}
          <div>
            <Label>Zoom</Label>
            <input
              type="range"
              min="1"
              max="3"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer mt-2"
              style={{accentColor: 'var(--accent-color)'}}
            />
            <div className="text-sm text-muted mt-1">
              {(zoom * 100).toFixed(0)}%
            </div>
          </div>

          {/* Freeform Mode Controls */}
          {aspectRatio === undefined && (() => {
            const scaleFactor = imageHeight / 320;
            const renderedHeight = 320;
            const renderedWidth = (imageWidth / imageHeight) * renderedHeight;
            
            return (
              <div className="space-y-4 p-3 bg-secondary rounded-lg">
                <div>
                  <Label>Width: {Math.round(cropWidth)}px</Label>
                  <input
                    type="range"
                    min="1"
                    max={renderedWidth / scaleFactor}
                    step="1"
                    value={cropWidth / scaleFactor}
                    onChange={(e) => {
                      const sliderValue = parseFloat(e.target.value);
                      const newWidth = sliderValue * scaleFactor;
                      setCropWidth(newWidth);
                      console.log('Crop Width:', newWidth, 'px, Height:', cropHeight, 'px');
                    }}
                    className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer mt-2"
                    style={{accentColor: 'var(--accent-color)'}}
                  />
                </div>
                <div>
                  <Label>Height: {Math.round(cropHeight)}px</Label>
                  <input
                    type="range"
                    min="1"
                    max={renderedHeight / scaleFactor}
                    step="1"
                    value={cropHeight / scaleFactor}
                    onChange={(e) => {
                      const sliderValue = parseFloat(e.target.value);
                      const newHeight = sliderValue * scaleFactor;
                      setCropHeight(newHeight);
                      console.log('Crop Width:', cropWidth, 'px, Height:', newHeight, 'px');
                    }}
                    className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer mt-2"
                    style={{accentColor: 'var(--accent-color)'}}
                  />
                </div>
                <p className="text-xs text-muted">
                  Adjust width or height independently
                </p>
              </div>
            );
          })()}

          {/* Info */}
          <p className="text-sm text-muted">
            Use the slider to zoom in and out, then drag to reposition the image.
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isProcessing}
            className="btn-primary"
          >
            {isProcessing ? 'Processing...' : 'Save Crop'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
