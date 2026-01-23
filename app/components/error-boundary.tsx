import { isRouteErrorResponse, useRouteError } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">
              {error.status} {error.statusText}
            </CardTitle>
            <CardDescription>
              {error.status === 404
                ? "The page you're looking for doesn't exist."
                : 'Something went wrong on our end.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error.data && (
              <p className="text-sm text-gray-600">{error.data}</p>
            )}
            <div className="flex gap-2">
              <Button
                onClick={() => window.history.back()}
                variant="outline"
                className="flex-1"
              >
                Go Back
              </Button>
              <Button
                onClick={() => (window.location.href = '/')}
                className="flex-1"
              >
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error instanceof Error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Oops! Something went wrong</CardTitle>
            <CardDescription>
              An unexpected error occurred. Our team has been notified.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm font-mono text-red-800">{error.message}</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="flex-1"
              >
                Reload Page
              </Button>
              <Button
                onClick={() => (window.location.href = '/')}
                className="flex-1"
              >
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-red-600">Unknown Error</CardTitle>
          <CardDescription>
            An unexpected error occurred. Please try again later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => (window.location.href = '/')}
            className="w-full"
          >
            Go Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
