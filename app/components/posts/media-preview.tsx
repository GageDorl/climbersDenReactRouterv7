interface MediaPreviewProps {
  urls: string[];
  onRemove?: (index: number) => void;
  editable?: boolean;
}

export function MediaPreview({ urls, onRemove, editable = false }: MediaPreviewProps) {
  if (urls.length === 0) return null;

  return (
    <div className={`grid gap-2 ${
      urls.length === 1 ? 'grid-cols-1' : 
      urls.length === 2 ? 'grid-cols-2' : 
      'grid-cols-2 md:grid-cols-3'
    }`}>
      {urls.map((url, index) => {
        const isVideo = url.includes('.mp4') || url.includes('.mov') || url.includes('video');
        
        return (
          <div key={index} className="relative group">
            {isVideo ? (
              <video
                src={url}
                controls
                className="w-full h-48 object-cover rounded-md"
              />
            ) : (
              <img
                src={url}
                alt={`Media ${index + 1}`}
                className="w-full h-48 object-cover rounded-md"
              />
            )}
            {editable && onRemove && (
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="absolute top-2 right-2 btn-destructive rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove media"
              >
                ×
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
