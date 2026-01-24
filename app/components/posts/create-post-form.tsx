import { useState, useCallback, useRef } from 'react';
import { Form, useActionData } from 'react-router';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { ImageCropper } from '~/components/posts/image-cropper';
import { MediaGrid, type MediaItem } from '~/components/posts/media-grid';
import { UploadProgress, type UploadProgressItem } from '~/components/posts/upload-progress';
import { AlertCircle, Loader } from 'lucide-react';

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
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  /**
   * Upload a file directly to Cloudinary using signed upload
   */
  const uploadToCloudinary = async (file: File, progressId: string): Promise<string | null> => {
    try {
      const folder = file.type.startsWith('video/') ? 'posts/videos' : 'posts/images';
      
      // Get upload signature from server
      const configResponse = await fetch(`/api/upload/signature?folder=${encodeURIComponent(folder)}&preset=post`);
      if (!configResponse.ok) {
        console.error('Signature response not ok:', configResponse.status);
        throw new Error('Failed to get upload signature');
      }

      const { signature, timestamp, apiKey, cloudName, folder: signedFolder } = await configResponse.json();
      console.log('Got signature, cloudName:', cloudName);

      // Prepare FormData with exactly the parameters that were signed
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('timestamp', timestamp.toString());
      uploadFormData.append('signature', signature);
      uploadFormData.append('api_key', apiKey);
      uploadFormData.append('folder', signedFolder);

      // Upload to Cloudinary
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
      console.log('Uploading to:', uploadUrl);

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: uploadFormData,
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Cloudinary error:', response.status, error);
        throw new Error(`Upload failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('Upload success:', data.secure_url);
      return data.secure_url;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      return null;
    }
  };

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

    // Process files - upload to Cloudinary directly
    const uploadedUrlsList: string[] = [];
    for (let i = 0; i < filesToAdd.length; i++) {
      const file = filesToAdd[i];
      const progressId = progressItems[i].id;

      try {
        // Upload directly to Cloudinary
        const cloudinaryUrl = await uploadToCloudinary(file, progressId);
        
        if (cloudinaryUrl) {
          uploadedUrlsList.push(cloudinaryUrl);

          // Create local media item for preview
          const mediaItem = await createMediaItemFromFile(file);
          if (mediaItem) {
            setMedia((prev) => [...prev, { ...mediaItem, url: cloudinaryUrl }]);
          }

          setUploadProgress((prev) =>
            prev.map((p) =>
              p.id === progressId
                ? { ...p, progress: 100, status: 'success' as const }
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

    setUploadedUrls((prev) => [...prev, ...uploadedUrlsList]);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveMedia = (id: string) => {
    setMedia((prev) => {
      const itemToRemove = prev.find((m) => m.id === id);
      if (itemToRemove && 'url' in itemToRemove) {
        setUploadedUrls((urls) => urls.filter((u) => u !== (itemToRemove as any).url));
      }
      return prev.filter((m) => m.id !== id);
    });
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

  // Submit form with only text and media URLs (no files)
  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formRef.current) return;
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Create FormData with text content and media URLs (not files)
      const formData = new FormData();
      formData.append('textContent', textContent);

      // Add Cloudinary URLs only
      for (const url of uploadedUrls) {
        formData.append('mediaUrl', url);
      }

      const response = await fetch(formRef.current.action || '', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        // Navigate to posts page or the new post
        window.location.href = '/posts';
      } else {
        const error = await response.json();
        console.error('Form submission error:', error);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
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
          className="space-y-6"
          onSubmit={handleFormSubmit}
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
              className="flex w-full rounded-md border border-default bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 resize-none"
              placeholder="Share your climbing experience, ask for beta, or connect with the community..."
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-sm text-muted">
                {charCount}/2000 characters
              </p>
              {actionData?.error && (
                <div className="flex items-center gap-1 text-sm text-destructive">
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
            <p className="text-sm text-muted mb-2">
              Upload up to {MAX_MEDIA_ITEMS} images or 1 video (max{' '}
              {MAX_FILE_SIZE / 1024 / 1024}MB, {MAX_VIDEO_DURATION / 60} min)
            </p>
            {isAtMaxCapacity && (
              <div className="mb-2 p-3 border border-default rounded-md flex gap-2" style={{backgroundColor: 'var(--accent-color)', opacity: 0.1}}>
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{color: 'var(--accent-color)'}} />
                <p className="text-sm" style={{color: 'var(--accent-color)'}}>
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
            <p className="text-xs text-muted mt-2">
              Files upload directly to cloud storage (no server bottleneck)
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <Button
              type="submit"
              className="flex-1 btn-primary"
              disabled={textContent.trim().length === 0 && media.length === 0 || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Creating Post...
                </>
              ) : (
                'Create Post'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => window.history.back()}
              disabled={isSubmitting}
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
