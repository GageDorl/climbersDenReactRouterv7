import { useState, useCallback } from 'react';
import { GripVertical, X, Image as ImageIcon, Video } from 'lucide-react';
import { Button } from '~/components/ui/button';

export interface MediaItem {
  id: string;
  file: File;
  preview: string;
  type: 'image' | 'video';
  size: number;
}

interface MediaGridProps {
  media: MediaItem[];
  onRemove: (id: string) => void;
  onReorder: (newMedia: MediaItem[]) => void;
  onEdit?: (id: string, file: File, preview: string) => void;
  maxItems?: number;
  maxFileSize?: number;
}

export function MediaGrid({
  media,
  onRemove,
  onReorder,
  onEdit,
  maxItems = 10,
  maxFileSize = 100 * 1024 * 1024, // 100MB
}: MediaGridProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    const draggedIndex = media.findIndex((m) => m.id === draggedId);
    const targetIndex = media.findIndex((m) => m.id === targetId);

    const newMedia = [...media];
    const [draggedItem] = newMedia.splice(draggedIndex, 1);
    newMedia.splice(targetIndex, 0, draggedItem);

    onReorder(newMedia);
    setDraggedId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">
          Media Items ({media.length}/{maxItems})
        </div>
        {media.length > 0 && (
          <div className="text-xs text-gray-500">
            Total: {formatFileSize(media.reduce((sum, m) => sum + m.size, 0))}
          </div>
        )}
      </div>

      {media.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 dark:bg-gray-900 dark:border-gray-700">
          <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">
            No media added yet. Upload images or videos to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {media.map((item) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(item.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, item.id)}
              onDragEnd={handleDragEnd}
              className={`relative group rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 aspect-square transition-all cursor-pointer ${
                draggedId === item.id ? 'opacity-50 ring-2 ring-blue-500' : 'hover:ring-2 hover:ring-gray-400'
              }`}
              onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
            >
              {/* Preview */}
              {item.type === 'image' ? (
                <img
                  src={item.preview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-900">
                  <Video className="w-8 h-8 text-gray-400" />
                </div>
              )}

              {/* Overlay Controls */}
              <div className={`absolute inset-0 bg-black transition-all flex items-center justify-center gap-2 ${expandedId === item.id ? 'bg-opacity-40 opacity-100' : 'bg-opacity-0 group-hover:bg-opacity-40 opacity-0 group-hover:opacity-100'}`}>
                {/* Drag Handle */}
                <button
                  type="button"
                  className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-white transition-colors"
                  title="Drag to reorder"
                >
                  <GripVertical className="w-4 h-4" />
                </button>

                {/* Edit Button (for images only) */}
                {item.type === 'image' && onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(item.id, item.file, item.preview)}
                    className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white transition-colors"
                  >
                    Crop
                  </button>
                )}

                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  className="p-1.5 bg-red-600 hover:bg-red-700 rounded text-white transition-colors"
                  title="Remove this item"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Badge */}
              <div className="absolute top-2 right-2 px-2 py-1 bg-black bg-opacity-70 rounded text-xs text-white flex items-center gap-1">
                {item.type === 'image' ? (
                  <>
                    <ImageIcon className="w-3 h-3" />
                    <span>IMG</span>
                  </>
                ) : (
                  <>
                    <Video className="w-3 h-3" />
                    <span>VID</span>
                  </>
                )}
              </div>

              {/* File Size */}
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-black bg-opacity-70 rounded text-xs text-white">
                {formatFileSize(item.size)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• Drag media items to reorder</p>
        <p>• Click crop to edit images</p>
        <p>• Maximum {maxItems} items per post</p>
        <p>• Maximum file size: {formatFileSize(maxFileSize)}</p>
      </div>
    </div>
  );
}
