import type { Route } from "./+types/users.$userId.edit";
import { redirect } from "react-router";
import { Form, useNavigation } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { getUserId } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { profileSetupSchema } from "~/lib/validation";
import { useState } from "react";
import { ImageCropper } from "~/components/posts/image-cropper";

// Utility function to compress an image file
const compressImage = (file: File, maxSizeMB: number = 8, quality: number = 0.8): Promise<File> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions (max 800x800 for profile pictures)
      const maxDimension = 800;
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxDimension) {
          height = (height * maxDimension) / width;
          width = maxDimension;
        }
      } else {
        if (height > maxDimension) {
          width = (width * maxDimension) / height;
          height = maxDimension;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            
            console.log('Image compressed:', file.size, '→', compressedFile.size, 'bytes');
            resolve(compressedFile);
          } else {
            reject(new Error('Compression failed'));
          }
        },
        'image/jpeg',
        quality
      );
    };
    
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = URL.createObjectURL(file);
  });
};

export async function loader({ request, params }: Route.LoaderArgs) {
  const currentUserId = await getUserId(request);
  if (!currentUserId) {
    return redirect("/auth/login");
  }

  const username = params.username;
  if (!username) {
    throw new Response("Username is required", { status: 400 });
  }

  // Find user by displayName
  const user = await db.user.findUnique({
    where: { displayName: username },
    select: {
      id: true,
      displayName: true,
      bio: true,
      profilePhotoUrl: true,
      climbingStyles: true,
      experienceLevel: true,
      locationCity: true,
      locationPermissionGranted: true,
      lastLocationUpdate: true,
    },
  });

  if (!user) {
    throw new Response('User not found', { status: 404 });
  }

  // Check if user is editing their own profile
  if (user.id !== currentUserId) {
    throw new Response("Forbidden", { status: 403 });
  }

  return { user };
}

export async function action({ request, params }: Route.ActionArgs) {
  const currentUserId = await getUserId(request);
  if (!currentUserId) {
    return redirect("/auth/login");
  }

  const username = params.username;
  if (!username) {
    throw new Response("Username is required", { status: 400 });
  }

  // Find user by displayName
  const user = await db.user.findUnique({
    where: { displayName: username },
    select: { id: true },
  });

  if (!user || user.id !== currentUserId) {
    throw new Response("Forbidden", { status: 403 });
  }

  const formData = await request.formData();
  const displayName = formData.get("displayName");
  const bio = formData.get("bio");
  const climbingStyles = formData.getAll("climbingStyles");
  const experienceLevel = formData.get("experienceLevel");
  const profilePhotoUrl = formData.get("profilePhotoUrl") as string | null;

  // Validate input
  const result = profileSetupSchema.safeParse({
    displayName,
    bio: bio || undefined,
    climbingStyles,
    experienceLevel,
  });

  if (!result.success) {
    return {
      error: result.error.issues[0].message,
      fields: { displayName, bio, climbingStyles, experienceLevel },
    };
  }

  const { displayName: validDisplayName, bio: validBio, climbingStyles: validStyles, experienceLevel: validLevel } = result.data;

  // Check if displayName is already taken by another user
  const existingUser = await db.user.findUnique({
    where: { displayName: validDisplayName },
  });

  if (existingUser && existingUser.id !== currentUserId) {
    return {
      error: "This username is already taken. Please choose another.",
      fields: { displayName: validDisplayName, bio: validBio, climbingStyles: validStyles, experienceLevel: validLevel },
    };
  }

  // Update user profile
  const updateData: any = {
    displayName: validDisplayName,
    bio: validBio,
    climbingStyles: validStyles,
    experienceLevel: validLevel,
  };

  if (profilePhotoUrl) {
    updateData.profilePhotoUrl = profilePhotoUrl;
  }

  await db.user.update({
    where: { id: currentUserId },
    data: updateData,
  });

  return redirect(`/users/${validDisplayName}`);
}

export default function EditProfile({ loaderData, actionData }: Route.ComponentProps) {
  const { user } = loaderData;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(user.profilePhotoUrl || null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImage, setCropperImage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoadingConversion, setIsLoadingConversion] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  /**
   * Upload a file directly to Cloudinary using signed upload
   */
  const uploadToCloudinary = async (file: File): Promise<string | null> => {
    try {
      console.log('Starting Cloudinary upload for:', file.name, file.size, file.type);
      
      // Get upload signature from server
      const signatureUrl = '/api/upload/signature?folder=profile-photos&preset=profile';
      console.log('Requesting signature from:', signatureUrl);
      
      const configResponse = await fetch(signatureUrl);
      console.log('Signature response status:', configResponse.status, configResponse.statusText);
      
      if (!configResponse.ok) {
        const errorText = await configResponse.text();
        console.error('Signature response error:', errorText);
        throw new Error(`Failed to get upload signature: ${configResponse.status} - ${errorText}`);
      }

      const config = await configResponse.json();
      console.log('Upload signature response:', config);
      
      const { signature, timestamp, apiKey, cloudName, folder } = config;

      // Prepare FormData with exactly the parameters that were signed
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('timestamp', timestamp.toString());
      uploadFormData.append('signature', signature);
      uploadFormData.append('api_key', apiKey);
      uploadFormData.append('folder', folder);

      // Log form data for debugging
      console.log('Upload form data prepared with:');
      console.log('- file:', file.name, file.size, file.type);
      console.log('- timestamp:', timestamp);
      console.log('- signature:', signature);
      console.log('- api_key:', apiKey);
      console.log('- folder:', folder);

      // Upload to Cloudinary
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
      console.log('Uploading to:', uploadUrl);
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: uploadFormData,
      });

      console.log('Cloudinary response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Cloudinary error:', response.status, errorText);
        
        // Parse Cloudinary error for better user feedback
        let errorMessage = `Upload failed: ${response.status}`;
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error?.message) {
            errorMessage = errorData.error.message;
          }
        } catch (parseError) {
          // Use default error message if parsing fails
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Upload successful:', data.secure_url);
      return data.secure_url;
    } catch (error) {
      console.error('Profile photo upload error:', error);
      return null;
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File input triggered');
    const file = e.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('File selected:', file.name, file.type, file.size);

    let processedFile = file;
    const isHeicFile = file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');

    // Convert HEIC/HEIF files to JPEG (client-side only)
    if (typeof window !== 'undefined' && isHeicFile) {
      setIsLoadingConversion(true);
      try {
        console.log('Converting HEIC file to JPEG...');
        // Dynamic import with client-side check to avoid SSR issues
        const { default: heic2any } = await import('heic2any');
        const convertedBlob = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.9
        }) as Blob;
        
        // Create a new File from the converted blob
        processedFile = new File([convertedBlob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        console.log('HEIC conversion successful:', processedFile.name, processedFile.type, processedFile.size);
      } catch (error) {
        console.error('HEIC conversion failed:', error);
        setIsLoadingConversion(false);
        alert('Failed to convert HEIC image. Please try a different format.');
        return;
      } finally {
        setIsLoadingConversion(false);
      }
    } else if (isHeicFile) {
      // Server-side or HEIC conversion unavailable
      alert('HEIC images are not supported. Please convert to JPEG first.');
      return;
    }

    setSelectedFile(processedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      console.log('FileReader loaded, setting cropper image');
      setCropperImage(event.target?.result as string);
      setCropperOpen(true);
    };
    reader.readAsDataURL(processedFile);
  };

  const handleCropperSave = async (croppedImageUrl: string, croppedFile: File) => {
    console.log('Cropper save called with file:', croppedFile.name, croppedFile.size);
    
    try {
      // Show preview immediately
      setProfilePhotoUrl(croppedImageUrl);
      setCropperOpen(false);
      setCropperImage('');
      
      // Compress the cropped image if it's too large
      let finalFile = croppedFile;
      if (croppedFile.size > 8 * 1024 * 1024) { // 8MB threshold
        console.log('File too large, compressing...', croppedFile.size);
        setIsUploadingImage(true); // Show compression as part of upload
        try {
          finalFile = await compressImage(croppedFile, 8, 0.8);
          console.log('Compression successful:', finalFile.size);
        } catch (compressionError) {
          console.error('Compression failed:', compressionError);
          alert('Image is too large and compression failed. Please try a smaller image.');
          setProfilePhotoUrl(user.profilePhoto || '');
          return;
        }
      }
      
      // Upload to Cloudinary
      setIsUploadingImage(true);
      const uploadedUrl = await uploadToCloudinary(finalFile);
      
      if (uploadedUrl) {
        console.log('Upload successful:', uploadedUrl);
        setProfilePhotoUrl(uploadedUrl);
      } else {
        console.error('Upload failed');
        setProfilePhotoUrl(user.profilePhoto || '');
        alert('Upload failed. Please try again.');
      }
    } catch (error) {
      console.error('Profile upload error:', error);
      setProfilePhotoUrl(user.profilePhoto || '');
      
      // Better error messages based on error type
      if (error instanceof Error) {
        if (error.message.includes('File size too large')) {
          alert('Image file is too large. Please try a smaller image or different format.');
        } else if (error.message.includes('400')) {
          alert('Upload failed - invalid image format or size. Please try a different image.');
        } else {
          alert('Upload failed: ' + error.message);
        }
      } else {
        alert('Upload failed. Please try again.');
      }
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleCropperCancel = () => {
    setCropperOpen(false);
    setCropperImage('');
    setSelectedFile(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Card>
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
            <CardDescription>
              Update your profile information
            </CardDescription>
          </CardHeader>
          <Form method="post">
            <CardContent className="space-y-6">
              {actionData?.error && (
                <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-3 text-sm">
                  {actionData.error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  name="displayName"
                  type="text"
                  required
                  maxLength={100}
                  defaultValue={actionData?.fields?.displayName as string || user.displayName}
                  placeholder="Your climbing name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <textarea
                  id="bio"
                  name="bio"
                  className="w-full min-h-24 px-3 py-2 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={500}
                  defaultValue={actionData?.fields?.bio as string || user.bio || ''}
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profilePhoto">Update Profile Photo</Label>
                {profilePhotoUrl && (
                  <div className="mb-2 relative">
                    <img
                      src={profilePhotoUrl}
                      alt="Current profile"
                      className="w-20 h-20 rounded-full object-cover"
                    />
                    {isUploadingImage && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      </div>
                    )}
                  </div>
                )}
                <Input
                  id="profilePhoto"
                  type="file"
                  accept="image/*,.heic,.heif"
                  onChange={handleFileSelect}
                  disabled={isLoadingConversion || isUploadingImage}
                />
                {isLoadingConversion && (
                  <p className="text-sm text-blue-600">Converting HEIC image...</p>
                )}
                {isUploadingImage && (
                  <p className="text-sm text-blue-600">Uploading image...</p>
                )}
                {profilePhotoUrl && (
                  <input type="hidden" name="profilePhotoUrl" value={profilePhotoUrl} />
                )}
              </div>

              <div className="space-y-2">
                <Label>Climbing Styles</Label>
                <div className="space-y-2">
                  {['bouldering', 'sport', 'trad', 'mixed'].map((style) => (
                    <div key={style} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`style-${style}`}
                        name="climbingStyles"
                        value={style}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        defaultChecked={
                          actionData?.fields?.climbingStyles?.includes(style as any) ||
                          user.climbingStyles.includes(style)
                        }
                      />
                      <label htmlFor={`style-${style}`} className="text-sm capitalize">
                        {style}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="experienceLevel">Experience Level</Label>
                <select
                  id="experienceLevel"
                  name="experienceLevel"
                  required
                  className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue={actionData?.fields?.experienceLevel as string || user.experienceLevel}
                >
                  <option value="">Select your experience level</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
              </div>

              <div className="flex space-x-4">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.history.back()}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Form>

          {/* Image cropper modal */}
          <ImageCropper
            open={cropperOpen}
            imageSrc={cropperImage}
            onSave={handleCropperSave}
            onCancel={handleCropperCancel}
          />

          {/* HEIC Conversion Loading Modal */}
          <Dialog open={isLoadingConversion}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Converting Image</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center justify-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-sm text-gray-600 text-center">
                  Converting HEIC image to JPEG format...
                </p>
              </div>
            </DialogContent>
          </Dialog>

          {/* Image Upload Loading Modal */}
          <Dialog open={isUploadingImage}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Uploading Image</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center justify-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-sm text-gray-600 text-center">
                  Uploading your profile picture...
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </Card>

        {/* Location Settings Card */}
        <LocationSettings
          currentCity={user.locationCity}
          lastLocationUpdate={user.lastLocationUpdate?.toISOString()}
          locationPermissionGranted={user.locationPermissionGranted}
        />
      </div>
    </div>
  );
}
