import { Link, useLocation, useRevalidator } from "react-router";
import { useEffect } from "react";
import { Button } from "./button";
import { useSocket } from "~/hooks/use-socket";

interface NavbarProps {
  userId?: string;
  displayName?: string;
  unreadMessageCount?: number;
}

export function Navbar({ userId, displayName, unreadMessageCount = 0 }: NavbarProps) {
  const location = useLocation();
  const revalidator = useRevalidator();
  const { socket } = useSocket();
  
  // Listen for new message notifications and revalidate to update unread count
  useEffect(() => {
    if (!socket || !userId) return;

    const handleNewMessage = () => {
      // Revalidate root loader to update unread count
      revalidator.revalidate();
    };

    const handleNotification = (data: any) => {
      // Revalidate on any notification that might affect message count
      if (data.notification.type === 'new_message') {
        revalidator.revalidate();
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('notification:new', handleNotification);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('notification:new', handleNotification);
    };
  }, [socket, userId, revalidator]);
  
  // Don't show navbar on auth pages
  if (location.pathname.startsWith('/auth')) {
    return null;
  }

  // Hide navbar entirely on conversation pages to maximize message viewing space
  if (location.pathname.startsWith('/messages/') && location.pathname !== '/messages' && location.pathname !== '/messages/_index' && location.pathname !== '/messages/new') {
    return null;
  }

  return (
    <>
      {/* Top Navbar */}
      <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo and Brand */}
            <Link to="/" className="flex items-center space-x-2">
              <svg 
                className="h-8 w-8 text-blue-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M13 10V3L4 14h7v7l9-11h-7z" 
                />
              </svg>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                climbersDen
              </span>
            </Link>

            {/* Navigation Links */}
            {userId ? (
              <div className="flex items-center space-x-1 sm:space-x-4">
                {/* Desktop Navigation */}
                <div className="hidden sm:flex sm:items-center sm:space-x-1">
                  <Link to="/posts">
                    <Button 
                      variant={location.pathname.startsWith('/posts') ? 'default' : 'ghost'}
                      size="sm"
                    >
                      Feed
                    </Button>
                  </Link>
                  <Link to="/discover">
                    <Button 
                      variant={location.pathname === '/discover' ? 'default' : 'ghost'}
                      size="sm"
                    >
                      Discover
                    </Button>
                  </Link>
                  <Link to="/crags">
                    <Button 
                      variant={location.pathname.startsWith('/crags') ? 'default' : 'ghost'}
                      size="sm"
                    >
                      Crags
                    </Button>
                  </Link>
                  <Link to="/ticks">
                    <Button 
                      variant={location.pathname.startsWith('/ticks') ? 'default' : 'ghost'}
                      size="sm"
                    >
                      Ticks
                    </Button>
                  </Link>
                </div>

                {/* Message Icon with Badge */}
                <Link to="/messages" className="relative">
                  <Button 
                    variant={location.pathname.startsWith('/messages') ? 'default' : 'ghost'}
                    size="sm"
                    className="relative"
                    aria-label={`Messages${unreadMessageCount > 0 ? ` (${unreadMessageCount} unread)` : ''}`}
                  >
                    <svg 
                      className="h-5 w-5" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" 
                      />
                    </svg>
                    {unreadMessageCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
                        {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                      </span>
                    )}
                  </Button>
                </Link>

                {/* Profile Menu */}
                <Link to={`/users/${displayName}`}>
                  <Button 
                    variant={location.pathname === `/users/${displayName}` ? 'default' : 'ghost'}
                    size="sm"
                  >
                    Profile
                  </Button>
                </Link>

                {/* Logout */}
                <form action="/auth/logout" method="post">
                  <Button 
                    type="submit" 
                    variant="ghost" 
                    size="sm"
                    className="text-red-600 hover:text-red-700 dark:text-red-400"
                  >
                    Logout
                  </Button>
                </form>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link to="/auth/login">
                  <Button variant="ghost" size="sm">
                    Login
                  </Button>
                </Link>
                <Link to="/auth/register">
                  <Button size="sm">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation - Only for authenticated users */}
      {userId && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950 sm:hidden">
          <div className="flex h-16 items-center justify-around px-4">
            {/* Feed */}
            <Link 
              to="/posts" 
              className={`flex flex-col items-center justify-center space-y-1 ${
                location.pathname.startsWith('/posts') 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <svg 
                className="h-6 w-6" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" 
                />
              </svg>
              <span className="text-xs font-medium">Feed</span>
            </Link>

            {/* Discover */}
            <Link 
              to="/discover" 
              className={`flex flex-col items-center justify-center space-y-1 ${
                location.pathname === '/discover' 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <svg 
                className="h-6 w-6" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" 
                />
              </svg>
              <span className="text-xs font-medium">Discover</span>
            </Link>

            {/* Crags */}
            <Link 
              to="/crags" 
              className={`flex flex-col items-center justify-center space-y-1 ${
                location.pathname.startsWith('/crags') 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <svg 
                className="h-6 w-6" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" 
                />
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" 
                />
              </svg>
              <span className="text-xs font-medium">Crags</span>
            </Link>

            {/* Ticks */}
            <Link 
              to="/ticks" 
              className={`flex flex-col items-center justify-center space-y-1 ${
                location.pathname.startsWith('/ticks') 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <svg 
                className="h-6 w-6" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
              <span className="text-xs font-medium">Ticks</span>
            </Link>
          </div>
        </nav>
      )}
    </>
  );
}
