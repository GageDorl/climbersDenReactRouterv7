import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import { ErrorBoundary as AppErrorBoundary } from "./components/error-boundary";
import { Navbar } from "./components/ui/navbar";
import { PageWrapper } from "./components/ui/page-wrapper";
import { getUserId } from "./lib/auth.server";
import { db } from "./lib/db.server";

export const meta: Route.MetaFunction = () => [
  { title: "climbersDen - Social Network for Rock Climbers" },
  { name: "description", content: "Connect with climbers, discover crags, track your climbing progress" },
];

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await getUserId(request);
  
  if (!userId) {
    return { user: null, unreadMessageCount: 0 };
  }

  // Get user info and unread message count
  const [user, unreadCount] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        displayName: true,
        profilePhotoUrl: true,
      },
    }),
    db.message.count({
      where: {
        recipientId: userId,
        readAt: null,
      },
    }),
  ]);

  return {
    user,
    unreadMessageCount: unreadCount,
  };
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen bg-gray-50 font-sans antialiased dark:bg-gray-900">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const { user, unreadMessageCount } = useLoaderData<typeof loader>();
  
  return (
    <>
      <Navbar 
        userId={user?.id} 
        displayName={user?.displayName} 
        unreadMessageCount={unreadMessageCount}
      />
      <Outlet />
    </>
  );
}

export function ErrorBoundary() {
  return <AppErrorBoundary />;
}
