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
import { uploadFileToCloudinary } from "~/lib/cloudinary.server";

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
  const profilePhoto = formData.get("profilePhoto") as File | null;

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

  // Upload profile photo if provided
  let profilePhotoUrl: string | undefined;
  if (profilePhoto && profilePhoto.size > 0) {
    try {
      const result = await uploadFileToCloudinary(profilePhoto, "profile-photos");
      profilePhotoUrl = result.secure_url;
    } catch (error) {
      return {
        error: "Failed to upload profile photo. Please try again.",
        fields: { displayName: validDisplayName, bio: validBio, climbingStyles: validStyles, experienceLevel: validLevel },
      };
    }
  }

  // Update user profile
  await db.user.update({
    where: { id: userId },
    data: {
      displayName: validDisplayName,
      bio: validBio,
      climbingStyles: validStyles,
      experienceLevel: validLevel,
      profilePhotoUrl,
    },
  });

  return redirect("/posts");
}

export default function ProfileSetup({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 px-4 py-8">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Complete your profile</CardTitle>
          <CardDescription>
            Tell the community about your climbing experience
          </CardDescription>
        </CardHeader>
        <Form method="post" encType="multipart/form-data">
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

            <div className="space-y-2">
              <Label htmlFor="profilePhoto">Profile Photo (optional)</Label>
              <Input
                id="profilePhoto"
                name="profilePhoto"
                type="file"
                accept="image/*"
              />
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
      </Card>
    </div>
  );
}
