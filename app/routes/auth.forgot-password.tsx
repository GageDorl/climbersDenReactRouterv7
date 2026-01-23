import type { Route } from "./+types/auth.forgot-password";
import { redirect } from "react-router";
import { Form, useNavigation } from "react-router";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { getUserId } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { sendPasswordResetEmail } from "~/lib/email.server";

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function loader({ request }: Route.LoaderArgs) {
  // Redirect if already logged in
  const userId = await getUserId(request);
  if (userId) {
    return redirect("/posts");
  }
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const email = formData.get("email");

  // Validate input
  const result = forgotPasswordSchema.safeParse({ email });

  if (!result.success) {
    return {
      error: result.error.issues[0].message,
      fields: { email },
    };
  }

  const { email: validEmail } = result.data;

  // Find user by email
  const user = await db.user.findUnique({
    where: { email: validEmail },
  });

  // Always return success for security (don't reveal if email exists)
  if (user) {
    try {
      // Generate reset token
      const resetToken = crypto.randomUUID();
      const resetExpiry = new Date(Date.now() + 3600000); // 1 hour

      // Store reset token in database
      await db.passwordResetToken.create({
        data: {
          userId: user.id,
          token: resetToken,
          expiresAt: resetExpiry,
        },
      });

      // Send reset email
      await sendPasswordResetEmail(validEmail, resetToken);
    } catch (error) {
      console.error('Password reset error:', error);
      // Still return success to not reveal errors
    }
  }

  return {
    success: true,
    message: "If an account exists with that email, you will receive a password reset link.",
  };
}

export default function ForgotPassword({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>
            Enter your email address and we'll send you a reset link
          </CardDescription>
        </CardHeader>
        <Form method="post">
          <CardContent className="space-y-4">
            {actionData?.success && (
              <div className="bg-green-50 border border-green-200 text-green-800 rounded-md p-3 text-sm">
                {actionData.message}
              </div>
            )}

            {actionData?.error && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-3 text-sm">
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
                placeholder="your@email.com"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Sending..." : "Send Reset Link"}
            </Button>

            <div className="text-center text-sm">
              <a href="/auth/login" className="text-blue-600 hover:underline">
                Back to login
              </a>
            </div>
          </CardContent>
        </Form>
      </Card>
    </div>
  );
}
