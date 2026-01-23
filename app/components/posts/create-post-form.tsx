import { useState, useCallback, useRef } from 'react';
import { Form, useActionData } from 'react-router';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { ImageCropper } from '~/components/posts/image-cropper';
import { MediaGrid, type MediaItem } from '~/components/posts/media-grid';
import { UploadProgress, type UploadProgressItem } from '~/components/posts/upload-progress';
import { AlertCircle } from 'lucide-react';

interface ActionData {
  error?: string;
}

export function CreatePostForm() {
  const actionData = useActionData<ActionData>();
  const [textContent, setTextContent] = useState('');
  const [charCount, setCharCount] = useState(0);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImage, setCropperImage] = useState('');
  const [cropperImageId, setCropperImageId] = useState('');
  const [uploadProgress, setUploadProgress] = useState<UploadProgressItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const MAX_MEDIA_ITEMS = 10;
  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  const MAX_VIDEO_DURATION = 120; // 2 minutes in seconds

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setTextContent(text);
    setCharCount(text.length);
  };

  const generateId = () => `media-${Date.now()}-${Math.random()}`;

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` };
    }

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      return { valid: false, error: 'Only images and videos are allowed' };
    }

    return { valid: true };
  };

  const createMediaItemFromFile = useCallback(
    (file: File): Promise<MediaItem | null> => {
      return new Promise((resolve) => {
        const validation = validateFile(file);
        if (!validation.valid) {
          console.error(validation.error);
          resolve(null);
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          const preview = e.target?.result as string;
          const type = file.type.startsWith('image/') ? 'image' : 'video';

          // For videos, validate duration
          if (type === 'video') {
            const video = document.createElement('video');
            video.onloadedmetadata = () => {
              if (video.duration > MAX_VIDEO_DURATION) {
                console.error(`Video too long (max ${MAX_VIDEO_DURATION} seconds)`);
                resolve(null);
                return;
              }

              resolve({
                id: generateId(),
                file,
                preview,
                type,
                size: file.size,
              });
            };
            video.src = preview;
          } else {
            resolve({
              id: generateId(),
              file,
              preview,
              type,
              size: file.size,
            });
          }
        };
        reader.readAsDataURL(file);
      });
    },
    []
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (!files) return;

    const newFiles = Array.from(files);
    const availableSlots = MAX_MEDIA_ITEMS - media.length;
    const filesToAdd = newFiles.slice(0, availableSlots);

    // Show upload progress
    const progressItems: UploadProgressItem[] = filesToAdd.map((file) => ({
      id: generateId(),
      filename: file.name,
      progress: 0,
      status: 'uploading' as const,
    }));
    setUploadProgress(progressItems);

    // Process files
    for (let i = 0; i < filesToAdd.length; i++) {
      const file = filesToAdd[i];
      const progressId = progressItems[i].id;

      try {
        const mediaItem = await createMediaItemFromFile(file);

        if (mediaItem) {
          setMedia((prev) => [...prev, mediaItem]);
          setUploadProgress((prev) =>
            prev.map((p) =>
              p.id === progressId
                ? { ...p, progress: 100, status: 'success' as const }
                : p
            )
          );
        } else {
          setUploadProgress((prev) =>
            prev.map((p) =>
              p.id === progressId
                ? {
                  ...p,
                  status: 'error' as const,
                  error: 'Failed to process file',
                }
                : p
            )
          );
        }
      } catch (err) {
        setUploadProgress((prev) =>
          prev.map((p) =>
            p.id === progressId
              ? {
                ...p,
                status: 'error' as const,
                error: err instanceof Error ? err.message : 'Unknown error',
              }
              : p
          )
        );
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveMedia = (id: string) => {
    setMedia((prev) => prev.filter((m) => m.id !== id));
  };

  const handleReorderMedia = (newMedia: MediaItem[]) => {
    setMedia(newMedia);
  };

  const handleEditMedia = (id: string, file: File, preview: string) => {
    setCropperImageId(id);
    setCropperImage(preview);
    setCropperOpen(true);
  };

  const handleCropperSave = (croppedImageUrl: string, croppedFile: File) => {
    setMedia((prev) =>
      prev.map((item) =>
        item.id === cropperImageId
          ? {
            ...item,
            file: croppedFile,
            preview: croppedImageUrl,
          }
          : item
      )
    );
    setCropperOpen(false);
    setCropperImage('');
    setCropperImageId('');
  };

  const handleCropperCancel = () => {
    setCropperOpen(false);
    setCropperImage('');
    setCropperImageId('');
  };

  const isAtMaxCapacity = media.length >= MAX_MEDIA_ITEMS;

  // Custom form submit to add media files to FormData
  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formRef.current) return;

    // Create a new FormData to include both text and media files
    const formData = new FormData();
    formData.append('textContent', textContent);

    // Add media files to the form data
    for (let i = 0; i < media.length; i++) {
      formData.append('media', media[i].file, `media-${i}`);
    }

    // Submit using the form's action
    const form = formRef.current;
    const method = form.method.toUpperCase();

    try {
      const response = await fetch(form.action || form.getAttribute('action') || '', {
        method,
        body: formData,
      });

      if (response.ok) {
        // The server should redirect on success, but in case it returns JSON
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const data = await response.json();
          if (data.redirectUrl) {
            window.location.href = data.redirectUrl;
          } else {
            window.location.href = '/posts';
          }
        } else {
          // Server redirected, let it handle navigation
          window.location.href = response.url || '/posts';
        }
      } else {
        const error = await response.json();
        console.error('Form submission error:', error);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Post</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          ref={formRef}
          method="post"
          encType="multipart/form-data"
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            handleFormSubmit(e);
          }}
        >
          {/* Text Content */}
          <div>
            <Label htmlFor="textContent">What's on your mind?</Label>
            <textarea
              id="textContent"
              name="textContent"
              value={textContent}
              onChange={handleTextChange}
              rows={6}
              maxLength={2000}
              className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 resize-none"
              placeholder="Share your climbing experience, ask for beta, or connect with the community..."
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-sm text-gray-500">
                {charCount}/2000 characters
              </p>
              {actionData?.error && (
                <div className="flex items-center gap-1 text-sm text-red-500">
                  <AlertCircle className="w-4 h-4" />
                  {actionData.error}
                </div>
              )}
            </div>
          </div>

          {/* Upload Progress */}
          {uploadProgress.length > 0 && (
            <UploadProgress
              items={uploadProgress}
              onDismiss={(id) =>
                setUploadProgress((prev) => prev.filter((p) => p.id !== id))
              }
              show={true}
            />
          )}

          {/* Media Grid */}
          {media.length > 0 && (
            <MediaGrid
              media={media}
              onRemove={handleRemoveMedia}
              onReorder={handleReorderMedia}
              onEdit={handleEditMedia}
              maxItems={MAX_MEDIA_ITEMS}
              maxFileSize={MAX_FILE_SIZE}
            />
          )}

          {/* Media Upload Input */}
          <div>
            <Label htmlFor="media-input">Add Photos or Video</Label>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Upload up to {MAX_MEDIA_ITEMS} images or 1 video (max{' '}
              {MAX_FILE_SIZE / 1024 / 1024}MB, {MAX_VIDEO_DURATION / 60} min)
            </p>
            {isAtMaxCapacity && (
              <div className="mb-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md flex gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  Maximum media items reached. Remove items to add more.
                </p>
              </div>
            )}
            <Input
              ref={fileInputRef}
              id="media-input"
              type="file"
              name="media-input"
              accept="image/*,video/*"
              multiple
              onChange={handleFileChange}
              disabled={isAtMaxCapacity}
              className="cursor-pointer"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Tip: You can crop images before uploading and drag to reorder
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <Button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={textContent.trim().length === 0 && media.length === 0}
            >
              Create Post
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => window.history.back()}
            >
              Cancel
            </Button>
          </div>
        </form>

        {/* Image Cropper Modal */}
        <ImageCropper
          imageSrc={cropperImage}
          open={cropperOpen}
          onSave={handleCropperSave}
          onCancel={handleCropperCancel}
        />
      </CardContent>
    </Card>
  );
}
