import { getUserId } from '~/lib/auth.server';
import { db } from '~/lib/db.server';
import { PageWrapper } from '~/components/ui/page-wrapper';
import { Link } from 'react-router';
import { Card, CardContent } from '~/components/ui/card';

export async function loader({ request }: any) {
  const userId = await getUserId(request);
  if (!userId) throw new Response('Unauthorized', { status: 401 });
  const groups = await db.groupChat.findMany({
    where: { participantIds: { has: userId } },
    orderBy: { lastMessageAt: 'desc' },
    include: {
      messages: {
        orderBy: { sentAt: 'desc' },
        take: 1,
        include: {
          sender: { select: { id: true, displayName: true, profilePhotoUrl: true } },
        },
      },
      creator: { select: { id: true, displayName: true } },
    },
  });

  // enrich with participant metadata (lastReadAt, muted) and compute unread counts
  const groupsWithMeta = await Promise.all(
    groups.map(async g => {
      const participant = await db.groupChatParticipant.findUnique({
        where: { groupChatId_participantId: { groupChatId: g.id, participantId: userId } } as any,
      });

      const lastRead = participant?.lastReadAt ?? new Date(0);
      const unreadCount = await db.groupMessage.count({
        where: { groupChatId: g.id, sentAt: { gt: lastRead }, senderId: { not: userId } },
      });

      return { ...g, unreadCount, muted: participant?.muted ?? false, lastReadAt: participant?.lastReadAt ?? null };
    })
  );

  return { groups: groupsWithMeta, userId };
}

export default function GroupsIndex({ loaderData }: any) {
  const { groups } = loaderData;

  return (
    <PageWrapper>
      <h1 className="text-3xl font-bold text-primary mb-6">Group Chats</h1>
      {groups.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted">No group chats yet. Create one to coordinate trips.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {groups.map((g: any) => {
            const last = g.messages[0];
            return (
              <Link key={g.id} to={`/groups/${g.id}`} className="block p-4 bg-surface rounded-md hover:bg-secondary">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-primary">{g.name}</div>
                    <div className="text-sm text-muted">{g.creator?.displayName}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-muted">{last ? new Date(last.sentAt).toLocaleString() : ''}</div>
                    {g.unreadCount > 0 && (
                      <div className="inline-flex items-center justify-center bg-accent text-on-accent rounded-full w-6 h-6 text-xs">{g.unreadCount}</div>
                    )}
                  </div>
                </div>
                {last && (
                  <div className="mt-2 text-sm text-secondary">{last.sender.displayName}: {last.textContent}</div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </PageWrapper>
  );
}
