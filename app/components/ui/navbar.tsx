import { Link, useLocation, useRevalidator } from "react-router";
import { useEffect } from "react";
import { Button } from "./button";
import { useSocket } from "~/hooks/use-socket";
import { Backpack, Bell, Home } from "lucide-react";

interface NavbarProps {
	userId?: string;
	displayName?: string;
	profilePhotoUrl?: string | null;
	unreadMessageCount?: number;
	unreadNotificationCount?: number;
}

function NavbarSocketHandler({ userId, revalidator }: { userId?: string; revalidator: ReturnType<typeof useRevalidator> }) {
	const { socket } = useSocket();

	useEffect(() => {
		if (!socket || !userId) return;

		// Helper to build a URL for a notification
		const buildNotificationUrl = (notif: any) => {
			const entityId = notif.entityId || '';
			const fragment = notif.fragmentId ? `#${notif.fragmentId}` : '';
			switch (notif.type) {
				case 'new_message':
					return `/messages/${entityId}${fragment}`;
				case 'post_comment':
				case 'comment_reply':
				case 'post_liked':
					return `/posts/${entityId}${fragment}`;
				case 'new_follower':
					return `/users/${entityId}`;
				case 'gear_claimed':
				case 'all_gear_claimed':
					return `/gear/${entityId}`;
				default:
					return '/';
			}
		};

		const showSystemNotification = (notif: any) => {
			if (!notif) return;
			if (typeof window === 'undefined' || !('Notification' in window)) return;
			// Only show system notification when page isn't visible
			if (document.visibilityState === 'visible') return;

			if (Notification.permission === 'default') {
				Notification.requestPermission().then((perm) => {
					if (perm === 'granted') showSystemNotification(notif);
				});
				return;
			}

			if (Notification.permission !== 'granted') return;

			const title = 'climbersDen';
			const body = notif.message || '';
			const url = buildNotificationUrl(notif);

			try {
				const n = new Notification(title, { body });
				n.onclick = () => {
					window.focus();
					window.location.href = url;
				};
			} catch (err) {
				console.error('Failed to show system notification', err);
			}
		};

		const onNewMessage = () => revalidator.revalidate();
		const onNotification = (data: any) => {
			revalidator.revalidate();
			// Attempt to show a browser notification for the incoming notification
			showSystemNotification(data?.notification);
		};

		socket.on('message:new', onNewMessage);
		socket.on('notification:new', onNotification);

		return () => {
			socket.off('message:new', onNewMessage);
			socket.off('notification:new', onNotification);
		};
	}, [socket, userId, revalidator]);

	return null;
}

export function Navbar({ userId, displayName, profilePhotoUrl, unreadMessageCount = 0, unreadNotificationCount = 0 }: NavbarProps) {
	const location = useLocation();

	if (location.pathname.startsWith("/auth")) return null;

	if (location.pathname.startsWith("/messages/") && location.pathname !== "/messages" && location.pathname !== "/messages/_index" && location.pathname !== "/messages/new") {
		return null;
	}

	// Hide navbar on group conversation pages (full-screen thread)
	if (location.pathname.startsWith('/groups/') && location.pathname !== '/groups' && location.pathname !== '/groups/new') {
		return null;
	}

	const revalidator = useRevalidator();

	return (
		<>
			{userId && <NavbarSocketHandler userId={userId} revalidator={revalidator} />}

			<nav className="sticky top-0 z-50 w-full border-b border-default bg-surface">
				<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div className="flex h-16 items-center justify-between">
						<Link to="/" className="flex items-center space-x-2">
							<svg className="h-8 w-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
							</svg>
							<span className="text-xl font-bold text-primary">climbersDen</span>
						</Link>

						{userId ? (
							<div className="flex items-center space-x-1 sm:space-x-4">
								<div className="hidden sm:flex sm:items-center sm:space-x-1">
									<Link to="/posts">
										<Button variant={location.pathname.startsWith("/posts") ? "default" : "ghost"} size="sm">
											Home
										</Button>
									</Link>
									<Link to="/discover">
										<Button variant={location.pathname === "/discover" ? "default" : "ghost"} size="sm">
											Discover
										</Button>
									</Link>
									<Link to="/crags">
										<Button variant={location.pathname.startsWith("/crags") ? "default" : "ghost"} size="sm">
											Crags
										</Button>
									</Link>
									<Link to="/gear">
										<Button variant={location.pathname.startsWith("/gear") ? "default" : "ghost"} size="sm">
											Gear
										</Button>
									</Link>
								</div>
								<Link to="/notifications" className="relative">
									<Button variant={location.pathname === "/notifications" ? "default" : "ghost"} size="sm" aria-label="Notifications">
										<Bell className="h-5 w-5" />
										{unreadNotificationCount > 0 && (
											<span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full alert-destructive text-xs font-bold">
												{unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
											</span>
										)}
									</Button>
								</Link>

								<Link to="/messages" className="relative">
									<Button
										variant={location.pathname.startsWith("/messages") ? "default" : "ghost"}
										size="sm"
										className="relative"
										aria-label={`Messages${unreadMessageCount > 0 ? ` (${unreadMessageCount} unread)` : ""}`}>
										<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
										</svg>
										{unreadMessageCount > 0 && (
											<span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full alert-destructive text-xs font-bold">
												{unreadMessageCount > 9 ? "9+" : unreadMessageCount}
											</span>
										)}
									</Button>
								</Link>


								<div className="hidden sm:flex items-center">
									<Link to={`/users/${displayName}`} className="flex items-center">
										{profilePhotoUrl ? (
											<img src={profilePhotoUrl} alt={displayName} className="h-8 w-8 rounded-full object-cover" />
										) : (
											<div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white font-medium">{(displayName || "U")[0]?.toUpperCase()}</div>
										)}
									</Link>
								</div>
							</div>
						) : (
							<div className="flex items-center space-x-2">
								<Link to="/auth/login"><Button variant="ghost" size="sm">Login</Button></Link>
								<Link to="/auth/register"><Button size="sm">Sign Up</Button></Link>
							</div>
						)}
					</div>
				</div>
			</nav>

			{userId && (
				<nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-default bg-surface sm:hidden">
					<div className="flex h-16 items-center justify-around px-4">
						<Link to="/posts" className={`flex flex-col items-center justify-center space-y-1 ${location.pathname.startsWith("/posts") ? "text-accent" : "text-secondary"}`}>
							<Home className="h-6 w-6" />
							<span className="text-xs font-medium">Home</span>
						</Link>

						<Link to="/discover" className={`flex flex-col items-center justify-center space-y-1 ${location.pathname === "/discover" ? "text-accent" : "text-secondary"}`}>
							<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
							<span className="text-xs font-medium">Discover</span>
						</Link>

						<Link to="/crags" className={`flex flex-col items-center justify-center space-y-1 ${location.pathname.startsWith("/crags") ? "text-accent" : "text-secondary"}`}>
							<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
							<span className="text-xs font-medium">Crags</span>
						</Link>

						<Link to="/gear" className={`flex flex-col items-center justify-center space-y-1 ${location.pathname.startsWith("/gear") ? "text-accent" : "text-secondary"}`}>
							<Backpack className="h-6 w-6" />
							<span className="text-xs font-medium">Gear</span>
						</Link>

						<Link to={`/users/${displayName}`} className={`flex flex-col items-center justify-center space-y-1 ${location.pathname === `/users/${displayName}` ? "text-accent" : "text-secondary"}`}>
							{profilePhotoUrl ? <img src={profilePhotoUrl} alt={displayName} className="h-6 w-6 rounded-full object-cover" /> : <div className="h-6 w-6 rounded-full bg-primary" />}
							<span className="text-xs font-medium">Profile</span>
						</Link>
					</div>
				</nav>
			)}
		</>
	);
}
