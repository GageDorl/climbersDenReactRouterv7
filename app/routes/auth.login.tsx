import type { Route } from "./+types/auth.login";
import { redirect } from "react-router";
import { Form, useNavigation, useSearchParams } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { createUserSession, getUserId, verifyPassword } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { loginSchema } from "~/lib/validation";

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
  const emailOrUsername = formData.get("emailOrUsername");
  const password = formData.get("password");
  const redirectTo = formData.get("redirectTo") as string || "/posts";

  // Validate input
  const result = loginSchema.safeParse({ emailOrUsername, password });

  if (!result.success) {
    return {
      error: result.error.issues[0].message,
      fields: { emailOrUsername },
    };
  }

  const { emailOrUsername: validEmailOrUsername, password: validPassword } = result.data;

  // Find user by email or username (displayName)
  const user = await db.user.findFirst({
    where: {
      OR: [
        { email: validEmailOrUsername },
        { displayName: validEmailOrUsername },
      ],
    },
  });

  if (!user) {
    return {
      error: "Invalid email/username or password",
      fields: { emailOrUsername: validEmailOrUsername },
    };
  }

  // Verify password
  const isValid = await verifyPassword(validPassword, user.passwordHash);

  if (!isValid) {
    return {
      error: "Invalid email/username or password",
      fields: { emailOrUsername: validEmailOrUsername },
    };
  }

  // Update last active
  await db.user.update({
    where: { id: user.id },
    data: { lastActiveAt: new Date() },
  });

  // Create session and redirect
  return createUserSession(user.id, redirectTo);
}

export default function Login({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/posts";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>
            Sign in to your climbersDen account
          </CardDescription>
        </CardHeader>
        <Form method="post">
          <input type="hidden" name="redirectTo" value={redirectTo} />
          
          <CardContent className="space-y-4">
            {actionData?.error && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-3 text-sm">
                {actionData.error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="emailOrUsername">Email or Username</Label>
              <Input
                id="emailOrUsername"
                name="emailOrUsername"
                type="text"
                required
                autoComplete="username"
                placeholder="your@email.com or username"
                defaultValue={actionData?.fields?.emailOrUsername as string}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                disabled={isSubmitting}
              />
            </div>

            <div className="flex justify-end">
              <a
                href="/auth/forgot-password"
                className="text-sm text-blue-600 hover:underline"
              >
                Forgot password?
              </a>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>

            <p className="text-sm text-center text-gray-600">
              Don't have an account?{" "}
              <a href="/auth/register" className="text-blue-600 hover:underline">
                Create one
              </a>
            </p>
          </CardFooter>
        </Form>
      </Card>
    </div>
  );
}
