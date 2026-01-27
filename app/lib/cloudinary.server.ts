import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadOptions {
  folder?: string;
  transformation?: any;
  public_id?: string;
  upload_preset?: string;
}

/**
 * Generate a signed upload URL for client-side uploads
 */
export async function generateUploadSignature(
  folder: string,
  preset: 'profile' | 'post' | 'journal' = 'post'
): Promise<{ signature: string; timestamp: number; apiKey: string; cloudName: string; folder: string; quality: string; transformation?: string }> {
  const timestamp = Math.round(new Date().getTime() / 1000);

  // Decide quality based on preset: profile -> auto:low, others -> auto:good
  const quality = preset === 'profile' ? 'auto:low' : 'auto:good';

  // For profile uploads, include a resize transformation to 800px width
  const transformation = preset === 'profile' ? JSON.stringify([{ width: 800, crop: 'scale' }]) : undefined;

  // Include only the parameters that will be sent by the client
  // No upload_preset needed for signed uploads - the signature authorizes
  const params: any = {
    timestamp,
    folder,
    quality,
  };
  if (transformation) params.transformation = transformation;

  const signature = cloudinary.utils.api_sign_request(
    params,
    process.env.CLOUDINARY_API_SECRET!
  );

  return {
    signature,
    timestamp,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    folder,
    quality,
    transformation,
  };
}

/**
 * Upload a file buffer to Cloudinary (server-side)
 */
export async function uploadToCloudinary(
  fileBuffer: Buffer,
  options: UploadOptions = {}
): Promise<{ secure_url: string; public_id: string }> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(options, (error, result) => {
        if (error) reject(error);
        else resolve({ secure_url: result!.secure_url, public_id: result!.public_id });
      })
      .end(fileBuffer);
  });
}

/**
 * Upload a File object to Cloudinary (converts to buffer first)
 * Includes automatic image optimization (format conversion, compression)
 */
export async function uploadFileToCloudinary(
  file: File,
  folder?: string
): Promise<{ secure_url: string; public_id: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  
  const options: UploadOptions = { folder };
  
  // Apply image optimization transformations
  if (isImage) {
    const quality = folder && folder.toLowerCase().includes('profile') ? 'auto:low' : 'auto:good';
    const isProfile = folder && folder.toLowerCase().includes('profile');
    options.transformation = [
      // If profile image, scale to 800px width first
      ...(isProfile ? [{ width: 800, crop: 'scale' }] : []),
      { quality }, // Automatic quality optimization
      { fetch_format: 'auto' }, // Automatic format conversion (WebP, AVIF)
      { flags: 'progressive' }, // Progressive loading
    ];
  }
  
  // Apply video optimizations
  if (isVideo) {
    const quality = folder && folder.toLowerCase().includes('profile') ? 'auto:low' : 'auto:good';
    const isProfile = folder && folder.toLowerCase().includes('profile');
    options.transformation = [
      ...(isProfile ? [{ width: 800, crop: 'scale' }] : []),
      { quality },
      { video_codec: 'auto' },
    ];
    // Generate thumbnail for video
    options.upload_preset = 'video_with_thumbnail';
  }
  
  return uploadToCloudinary(buffer, options);
}

/**
 * Generate video thumbnail from Cloudinary video URL
 */
export function getVideoThumbnail(videoUrl: string): string {
  // Extract public ID from Cloudinary URL
  const urlParts = videoUrl.split('/');
  const publicIdWithExt = urlParts[urlParts.length - 1];
  const publicId = publicIdWithExt.split('.')[0];
  
  // Generate thumbnail URL
  return cloudinary.url(publicId, {
    resource_type: 'video',
    format: 'jpg',
    transformation: [
      { width: 400, height: 300, crop: 'fill' },
      { quality: 'auto:good' },
    ],
  });
}

/**
 * Delete an image from Cloudinary
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}

/**
 * Get upload preset based on context
 */
function getUploadPreset(preset: 'profile' | 'post' | 'journal'): string {
  switch (preset) {
    case 'profile':
      return process.env.CLOUDINARY_UPLOAD_PRESET_PROFILE || 'profile_photos';
    case 'post':
      return process.env.CLOUDINARY_UPLOAD_PRESET_POST || 'post_media';
    case 'journal':
      return process.env.CLOUDINARY_UPLOAD_PRESET_JOURNAL || 'journal_media';
    default:
      return 'post_media';
  }
}

export { cloudinary };
