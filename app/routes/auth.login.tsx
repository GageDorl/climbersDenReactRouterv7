import { redirect } from "react-router";
import { Form, useNavigation, useSearchParams } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { createUserSession, getUserId, verifyPassword } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { loginSchema } from "~/lib/validation";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Redirect to posts feed if already logged in
  const userId = await getUserId(request);
  if (userId) {
    return redirect("/posts");
  }
  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const formData = await request.formData();
    const emailOrUsername = formData.get("emailOrUsername");
    const password = formData.get("password");
    const redirectTo = (formData.get("redirectTo") as string) || "/posts";

    // Debug: check what we're getting
    console.log("[Login] Form data:", { emailOrUsername, password, redirectTo });

    // Check if fields are null
    if (!emailOrUsername || !password) {
      console.log("[Login] Missing fields");
      return {
        error: "Email/username and password are required",
        fields: { emailOrUsername: emailOrUsername as string },
      };
    }

    // Validate input
    const result = loginSchema.safeParse({ emailOrUsername, password });

    if (!result.success) {
      console.log("[Login] Validation failed:", result.error.issues);
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
      console.log("[Login] User not found");
      return {
        error: "Invalid email/username or password",
        fields: { emailOrUsername: validEmailOrUsername },
      };
    }

    // Verify password
    const isValid = await verifyPassword(validPassword, user.passwordHash);

    if (!isValid) {
      console.log("[Login] Invalid password");
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

    console.log("[Login] Creating session for user:", user.id);
    // Create session and redirect
    return createUserSession(user.id, redirectTo);
  } catch (error) {
    console.error("[Login] Error:", error);
    return {
      error: "An error occurred during login",
      fields: {},
    };
  }
};

export default function Login({ actionData }: { actionData?: any }) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/posts";

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 px-4">
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
