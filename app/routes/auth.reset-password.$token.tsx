import type { Route } from "./+types/auth.reset-password.$token";
import { redirect } from "react-router";
import { Form, useNavigation } from "react-router";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { hashPassword } from "~/lib/auth.server";
import { db } from "~/lib/db.server";

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export async function loader({ params }: Route.LoaderArgs) {
  const token = params.token;
  if (!token) {
    throw new Response("Invalid reset token", { status: 400 });
  }

  // Verify token exists and hasn't expired
  const resetToken = await db.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!resetToken || resetToken.expiresAt < new Date()) {
    return { error: "This reset link has expired or is invalid" };
  }

  return { token, valid: true };
}

export async function action({ request, params }: Route.ActionArgs) {
  const token = params.token;
  if (!token) {
    throw new Response("Invalid reset token", { status: 400 });
  }

  const formData = await request.formData();
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");

  // Validate input
  const result = resetPasswordSchema.safeParse({ password, confirmPassword });

  if (!result.success) {
    return {
      error: result.error.issues[0].message,
    };
  }

  const { password: validPassword } = result.data;

  // Find reset token
  const resetToken = await db.passwordResetToken.findUnique({
    where: { token },
  });

  if (!resetToken || resetToken.expiresAt < new Date()) {
    return {
      error: "This reset link has expired or is invalid",
    };
  }

  // Update user password
  const passwordHash = await hashPassword(validPassword);
  await db.user.update({
    where: { id: resetToken.userId },
    data: { passwordHash },
  });

  // Delete used token
  await db.passwordResetToken.delete({
    where: { token },
  });

  return redirect("/auth/login?reset=success");
}

export default function ResetPassword({ loaderData, actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  if (loaderData.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Reset Link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-3 text-sm">
              {loaderData.error}
            </div>
            <div className="text-center">
              <a href="/auth/forgot-password" className="text-blue-600 hover:underline">
                Request a new reset link
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set new password</CardTitle>
          <CardDescription>
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <Form method="post">
          <CardContent className="space-y-4">
            {actionData?.error && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-3 text-sm">
                {actionData.error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="At least 8 characters"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Repeat your password"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Resetting..." : "Reset Password"}
            </Button>
          </CardContent>
        </Form>
      </Card>
    </div>
  );
}
