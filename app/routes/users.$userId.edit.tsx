import type { Route } from "./+types/users.$userId.edit";
import { redirect } from "react-router";
import { Form, useNavigation } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { getUserId } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { profileSetupSchema } from "~/lib/validation";
import { useState } from "react";
import { ImageCropper } from "~/components/posts/image-cropper";

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
                  className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={500}
                  defaultValue={actionData?.fields?.bio as string || user.bio || ''}
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profilePhoto">Update Profile Photo</Label>
                {profilePhotoUrl && (
                  <div className="mb-2">
                    <img
                      src={profilePhotoUrl}
                      alt="Current profile"
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  </div>
                )}
                <Input
                  id="profilePhoto"
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                />
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
            isOpen={cropperOpen}
            image={cropperImage}
            onSave={handleCropperSave}
            onCancel={handleCropperCancel}
          />
        </Card>
      </div>
    </div>
  );
}
