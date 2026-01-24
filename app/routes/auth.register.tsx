import type { Route } from "./+types/auth.register";
import { redirect } from "react-router";
import { Form, useNavigation } from "react-router";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { createUserSession, getUserId, hashPassword } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { registerSchema } from "~/lib/validation";

export async function loader({ request }: Route.LoaderArgs) {
  // Redirect to posts feed if already logged in
  const userId = await getUserId(request);
  if (userId) {
    return redirect("/posts");
  }
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const email = formData.get("email");
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");
  const displayName = formData.get("displayName");

  // Validate input
  const result = registerSchema.safeParse({
    email,
    password,
    confirmPassword,
    displayName,
  });

  if (!result.success) {
    return {
      error: result.error.issues[0].message,
      fields: { email, displayName },
    };
  }

  const { email: validEmail, password: validPassword, displayName: validDisplayName } = result.data;

  // Check if email already exists
  const existingUser = await db.user.findUnique({
    where: { email: validEmail },
  });

  if (existingUser) {
    return {
      error: "A user with this email already exists",
      fields: { email: validEmail, displayName: validDisplayName },
    };
  }

  // Check if displayName already exists
  const existingDisplayName = await db.user.findUnique({
    where: { displayName: validDisplayName },
  });

  if (existingDisplayName) {
    return {
      error: "This username is already taken. Please choose another.",
      fields: { email: validEmail, displayName: validDisplayName },
    };
  }

  // Create user
  const passwordHash = await hashPassword(validPassword);
  const user = await db.user.create({
    data: {
      email: validEmail,
      passwordHash,
      displayName: validDisplayName,
      emailVerified: false, // Will be verified via email
      climbingStyles: [], // Will be set in profile setup
      experienceLevel: 'beginner', // Default, will be updated in profile setup
    },
  });

  // Create session and redirect to profile setup
  return createUserSession(user.id, "/auth/profile-setup");
}

export default function Register({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
          <CardDescription>
            Join the climbersDen community
          </CardDescription>
        </CardHeader>
        <Form method="post">
          <CardContent className="space-y-4">
            {actionData?.error && (
              <div className="alert-destructive rounded-md p-3 text-sm">
                {actionData.error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                defaultValue={actionData?.fields?.email as string}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                name="displayName"
                type="text"
                required
                autoComplete="username"
                defaultValue={actionData?.fields?.displayName as string}
                disabled={isSubmitting}
                maxLength={30}
              />
              <p className="text-xs text-muted-foreground">
                Use 3-30 characters: letters, numbers, or underscores only
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                disabled={isSubmitting}
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating account..." : "Create account"}
            </Button>

            <p className="text-sm text-center text-muted">
              Already have an account?{" "}
              <a href="/auth/login" className="link-primary">
                Sign in
              </a>
            </p>
          </CardFooter>
        </Form>
      </Card>
    </div>
  );
}
