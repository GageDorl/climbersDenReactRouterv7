import type { Route } from "./+types/users.$userId.edit";
import { redirect } from "react-router";
import { Form, useNavigation, useFetcher } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "~/components/ui/dialog";
import { getUserId } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { profileSetupSchema } from "~/lib/validation";
import { useState, useEffect } from "react";
import { ImageCropper } from "~/components/posts/image-cropper";
import { LocationSettings } from "~/components/location/location-settings";
import { PageWrapper } from "~/components/ui/page-wrapper";

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
  const deleteFetcher = useFetcher();

  // Handle account deletion result
  useEffect(() => {
    if (deleteFetcher.data && (deleteFetcher.data as any).success) {
      // After successful soft-delete, call logout action to clear session
      (async () => {
        try {
          await fetch('/auth/logout', { method: 'POST', credentials: 'same-origin' });
        } catch (e) {
          // ignore
        }
        // Redirect to home (session should be cleared)
        window.location.href = '/';
      })();
    }
  }, [deleteFetcher.data]);
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
        try {
          const errorData = JSON.parse(errorText);
          const cloudMsg = errorData.error?.message || `Upload failed: ${response.status}`;
          throw new Error(cloudMsg);
        } catch (parseError) {
          throw new Error(`Upload failed: ${response.status}`);
        }
      }

      const data = await response.json();
      console.log('Upload successful:', data.secure_url);
      return data.secure_url;
    } catch (error) {
      console.error('Profile photo upload error:', error);
      throw error;
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
      
      // Compress the cropped image until it's under Cloudinary's limit (10MB), try several passes
      const CLOUDINARY_MAX = 10 * 1024 * 1024; // 10MB
      let finalFile = croppedFile;
      if (finalFile.size > CLOUDINARY_MAX) {
        setIsUploadingImage(true);
        const attempts = [ { maxDim: 800, quality: 0.8 }, { maxDim: 700, quality: 0.7 }, { maxDim: 600, quality: 0.6 } ];
        let compressed: File | null = null;
        for (const attempt of attempts) {
          try {
            compressed = await compressImage(finalFile, attempt.maxDim, attempt.quality);
            console.log(`Compression attempt (dim=${attempt.maxDim},q=${attempt.quality}) produced size:`, compressed.size);
            finalFile = compressed;
            if (finalFile.size <= CLOUDINARY_MAX) break;
          } catch (e) {
            console.warn('Compression attempt failed', e);
          }
        }

        if (finalFile.size > CLOUDINARY_MAX) {
          setIsUploadingImage(false);
          console.error('Compressed image still exceeds limit:', finalFile.size);
          alert('Image is too large even after compression. Please choose a smaller image (under 10MB).');
          setProfilePhotoUrl(user.profilePhotoUrl || '');
          return;
        }
      }

      // Upload to Cloudinary
      setIsUploadingImage(true);
      try {
        const uploadedUrl = await uploadToCloudinary(finalFile);
        console.log('Upload successful:', uploadedUrl);
        setProfilePhotoUrl(uploadedUrl);
      } catch (err: any) {
        console.error('Upload failed:', err);
        setProfilePhotoUrl(user.profilePhotoUrl || '');
        alert(err?.message || 'Upload failed. Please try again.');
      } finally {
        setIsUploadingImage(false);
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
    <PageWrapper maxWidth="2xl" className="flex flex-col gap-2">
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
                <div className="alert-destructive rounded-md p-3 text-sm">
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
                  className="w-full min-h-24 px-3 py-2 text-sm rounded-md border-default focus:outline-none focus:ring-2 bg-surface text-primary"
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
                  <p className="text-sm" style={{color: 'var(--primary-color)'}}>Converting HEIC image...</p>
                )}
                {isUploadingImage && (
                  <p className="text-sm" style={{color: 'var(--primary-color)'}}>Uploading image...</p>
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
                        className="w-4 h-4 border-default rounded focus:ring-2" style={{color: 'var(--primary-color)'}}
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
                  className="w-full px-3 py-2 text-sm rounded-md border-default focus:outline-none focus:ring-2 bg-surface text-primary"
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 mb-4" style={{borderColor: 'var(--primary-color)'}}></div>
                <p className="text-sm text-secondary text-center">
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 mb-4" style={{borderColor: 'var(--primary-color)'}}></div>
                <p className="text-sm text-secondary text-center">
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

        {/* Danger Zone: Delete Account */}
        <Card>
          <CardHeader>
            <CardTitle>Danger Zone</CardTitle>
            <CardDescription>Permanently delete your account and all associated data. This action cannot be undone.</CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive" className="w-full">Delete Account</Button>
              </DialogTrigger>

              <DialogContent className="max-w-md flex flex-col items-center">
                <DialogHeader>
                  <DialogTitle>Delete Account</DialogTitle>
                  <DialogDescription>This will permanently remove your account and cannot be undone. Are you sure?</DialogDescription>
                </DialogHeader>
                <div className="mt-6 flex justify-center space-x-2">
                  <deleteFetcher.Form method="post" action="/api/user/delete" className="flex flex-col items-center gap-2">
                    <Button type="submit" variant="destructive" disabled={deleteFetcher.state === 'submitting'}>
                      {deleteFetcher.state === 'submitting' ? 'Deleting...' : 'Yes, delete my account'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => window.history.back()} className="mr-2">Cancel</Button>
                  </deleteFetcher.Form>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </PageWrapper>
  );
}
