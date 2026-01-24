import type { Route } from "./+types/auth.profile-setup";
import { redirect } from "react-router";
import { Form, useNavigation } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { getUserId } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { profileSetupSchema } from "~/lib/validation";
import { useState, useEffect, useRef } from "react";
import { ImageCropper } from "~/components/posts/image-cropper";
import { LocationPermissionModal } from "~/components/location/location-permission-modal";
import { useGeolocation } from "~/hooks/use-geolocation";

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await getUserId(request);
  if (!userId) {
    return redirect("/auth/login");
  }

  // Check if profile already setup (has climbing styles)
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { climbingStyles: true, experienceLevel: true },
  });

  if (user && user.climbingStyles.length > 0) {
    return redirect("/posts");
  }

  return { userId };
}

export async function action({ request }: Route.ActionArgs) {
  const userId = await getUserId(request);
  if (!userId) {
    return redirect("/auth/login");
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

  if (existingUser && existingUser.id !== userId) {
    return {
      error: "This username is already taken. Please choose another.",
      fields: { displayName: validDisplayName, bio: validBio, climbingStyles: validStyles, experienceLevel: validLevel },
    };
  }

  // Update user profile
  await db.user.update({
    where: { id: userId },
    data: {
      displayName: validDisplayName,
      bio: validBio,
      climbingStyles: validStyles,
      experienceLevel: validLevel,
      profilePhotoUrl: profilePhotoUrl || undefined,
    },
  });

  return redirect("/posts");
}

export default function ProfileSetup({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationModalStep, setLocationModalStep] = useState<'initial' | 'processing' | 'done'>('initial');
  const [shouldSubmitLocation, setShouldSubmitLocation] = useState(false);
  const { position, requestLocation } = useGeolocation();
  const hasSubmittedLocationRef = useRef(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImage, setCropperImage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Handle location submission after geolocation completes
  useEffect(() => {
    if (shouldSubmitLocation && position && !hasSubmittedLocationRef.current) {
      hasSubmittedLocationRef.current = true;
      
      const submitLocation = async () => {
        try {
          await fetch('/api/user/location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              latitude: position.latitude,
              longitude: position.longitude,
              granted: true,
            }),
          });
        } catch (error) {
          console.error('Failed to save location:', error);
        }
        
        setLocationModalStep('done');
        setTimeout(() => {
          setShowLocationModal(false);
          // Reset states
          setShouldSubmitLocation(false);
          hasSubmittedLocationRef.current = false;
          // Redirect to posts page
          window.location.href = '/posts';
        }, 800);
      };
      
      submitLocation();
    }
  }, [shouldSubmitLocation, position]);

  /**
   * Upload a file directly to Cloudinary using signed upload
   */
  const uploadToCloudinary = async (file: File): Promise<string | null> => {
    try {
      // Get upload signature from server
      const configResponse = await fetch(`/api/upload/signature?folder=profile-photos&preset=profile`);
      if (!configResponse.ok) {
        throw new Error('Failed to get upload signature');
      }

      const { signature, timestamp, apiKey, cloudName, folder } = await configResponse.json();

      // Prepare FormData with exactly the parameters that were signed
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('timestamp', timestamp.toString());
      uploadFormData.append('signature', signature);
      uploadFormData.append('api_key', apiKey);
      uploadFormData.append('folder', folder);

      // Upload to Cloudinary
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
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
      return data.secure_url;
    } catch (error) {
      console.error('Profile photo upload error:', error);
      return null;
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setCropperImage(event.target?.result as string);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropperSave = async (croppedImageUrl: string, croppedFile: File) => {
    const uploadedUrl = await uploadToCloudinary(croppedFile);
    if (uploadedUrl) {
      setProfilePhotoUrl(uploadedUrl);
    }
    setCropperOpen(false);
    setCropperImage('');
  };

  const handleCropperCancel = () => {
    setCropperOpen(false);
    setCropperImage('');
    setSelectedFile(null);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    // Show location modal after form validates
    setShowLocationModal(true);
  };

  const handleAllowLocation = () => {
    setLocationModalStep('processing');
    setShouldSubmitLocation(true);
    requestLocation();
  };

  const handleDenyLocation = () => {
    setShowLocationModal(false);
    hasSubmittedLocationRef.current = false;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 px-4 py-8">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Complete your profile</CardTitle>
          <CardDescription>
            Tell the community about your climbing experience
          </CardDescription>
        </CardHeader>
        <Form method="post" onSubmit={handleFormSubmit}>
          <CardContent className="space-y-6">
            {actionData?.error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 rounded-md p-3 text-sm">
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
                defaultValue={actionData?.fields?.displayName as string}
                placeholder="Your climbing name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio (optional)</Label>
              <textarea
                id="bio"
                name="bio"
                className="w-full min-h-25 px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={500}
                defaultValue={actionData?.fields?.bio as string}
                placeholder="Tell us about yourself..."
              />
            </div>

            {/* Profile photo upload with cropper */}
            <div className="space-y-2">
              <Label htmlFor="profilePhoto">Profile Photo (optional)</Label>
              <Input
                id="profilePhoto"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
              />
              {profilePhotoUrl && (
                <div className="mt-2">
                  <img
                    src={profilePhotoUrl}
                    alt="Profile preview"
                    className="w-20 h-20 rounded-full object-cover"
                  />
                  <input type="hidden" name="profilePhotoUrl" value={profilePhotoUrl} />
                </div>
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
                      className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                      defaultChecked={
                        actionData?.fields?.climbingStyles?.includes(style as any)
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
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                defaultValue={actionData?.fields?.experienceLevel as string}
              >
                <option value="">Select your experience level</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="expert">Expert</option>
              </select>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Setting up..." : "Complete Setup"}
            </Button>
          </CardContent>
        </Form>

        {/* Image cropper modal */}
        <ImageCropper
          imageSrc={cropperImage}
          open={cropperOpen}
          onSave={handleCropperSave}
          onCancel={handleCropperCancel}
        />
      </Card>

      {/* Location Permission Modal */}
      <LocationPermissionModal
        isOpen={showLocationModal}
        onAllow={handleAllowLocation}
        onDeny={handleDenyLocation}
        onAskLater={handleDenyLocation}
      />
    </div>
  );
}
