import type { Route } from "./+types/notifications";
import { useLoaderData, Link } from "react-router";
import { getUserId } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { PageWrapper } from "~/components/ui/page-wrapper";
import { Button } from "~/components/ui/button";
import { useState } from "react";

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await getUserId(request);
  if (!userId) return new Response(null, { status: 401 });

  const notifications = await db.notification.findMany({
    where: { userId },
    orderBy: [{ readStatus: 'asc' }, { createdAt: 'desc' }],
    take: 100,
  });

  // Fetch display names for any notifications that point to a user entity
  const userRefs = notifications.filter((n) => n.relatedEntityType === 'user').map((n) => n.relatedEntityId);
  const uniqueUserRefs = Array.from(new Set(userRefs));
  let userMap: Record<string, string> = {};
  if (uniqueUserRefs.length > 0) {
    const users = await db.user.findMany({ where: { id: { in: uniqueUserRefs } }, select: { id: true, displayName: true } });
    userMap = users.reduce((acc, u) => ({ ...acc, [u.id]: u.displayName }), {} as Record<string, string>);
  }

  const enriched = notifications.map((n) => ({
    ...n,
    relatedDisplayName: n.relatedEntityType === 'user' ? (userMap[n.relatedEntityId] ?? null) : null,
  }));

  return { notifications: enriched };
}

export default function NotificationsPage() {
  const { notifications } = useLoaderData<typeof loader>();
  const [items, setItems] = useState(notifications || []);
  const [loading, setLoading] = useState(false);

  const markRead = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'POST', credentials: 'same-origin' });
      if (res.ok) {
        setItems((s: any) => s.map((n: any) => n.id === id ? { ...n, readStatus: true } : n));
      }
    } finally { setLoading(false); }
  };

  const markAllRead = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications/markallread', { method: 'POST', credentials: 'same-origin' });
      if (res.ok) setItems((s: any) => s.map((n: any) => ({ ...n, readStatus: true })));
    } finally { setLoading(false); }
  };

  const clearAll = async () => {
    if (!confirm('Clear all notifications? This cannot be undone.')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/notifications/clear', { method: 'POST', credentials: 'same-origin' });
      if (res.ok) setItems([]);
    } finally { setLoading(false); }
  };

  return (
    <PageWrapper>
      <div className="max-w-3xl mx-auto py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Notifications</h1>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" onClick={markAllRead} disabled={loading}>Mark all read</Button>
            <Button variant="destructive" onClick={clearAll} disabled={loading}>Clear all</Button>
          </div>
        </div>

        <div className="space-y-3">
          {items.length === 0 && (
            <div className="p-4 rounded-md bg-surface border border-default text-primary">No notifications</div>
          )}

          {items.map((n: any) => {
            const href = (() => {
              switch (n.relatedEntityType) {
                case 'post':
                  return `/posts/${n.relatedEntityId}${(n.content && (n.content.fragmentId || n.content.commentId)) ? `#${(n.content.fragmentId || n.content.commentId)}` : ''}`;
                case 'message':
                  return `/messages/${n.relatedEntityId}${(n.content && (n.content.fragmentId || n.content.messageId)) ? `#${(n.content.fragmentId || n.content.messageId)}` : ''}`;
                case 'user':
                  return `/users/${n.relatedDisplayName ?? n.relatedEntityId}`;
                case 'gear_list':
                  return `/gear/${n.relatedEntityId}`;
                default:
                  return '#';
              }
            })();

            const itemInner = (
              <div className={`p-4 rounded-md border ${n.readStatus ? 'bg-surface border-default text-primary' : 'bg-secondary border-default text-primary'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-medium">{(n.content as any)?.message || n.type}</div>
                    <div className="text-xs text-secondary mt-1">{new Date(n.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!n.readStatus && <Button size="sm" onClick={(e: any) => { e.preventDefault(); e.stopPropagation(); markRead(n.id); }} disabled={loading}>Mark read</Button>}
                  </div>
                </div>
              </div>
            );

            return href === '#' ? (
              <div key={n.id}>{itemInner}</div>
            ) : (
              <Link key={n.id} to={href} className="block hover:underline" onClick={() => { if (!n.readStatus) markRead(n.id); }}>{itemInner}</Link>
            );
          })}
        </div>
      </div>
    </PageWrapper>
  );
}

