import { requireUserId } from '~/lib/auth.server';
import { db } from '~/lib/db.server';

export async function action({ request, params }: any) {
  const userId = await requireUserId(request);
  const { groupId } = params;

  const group = await db.groupChat.findUnique({ where: { id: groupId } });
  if (!group) throw new Response('Group not found', { status: 404 });
  if (!group.participantIds.includes(userId)) return { success: true };

  const newParticipants = group.participantIds.filter((id: string) => id !== userId);

  await db.groupChat.update({ where: { id: groupId }, data: { participantIds: newParticipants } });

  return { success: true };
}
