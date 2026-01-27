import { requireUserId } from '~/lib/auth.server';
import { db } from '~/lib/db.server';

export async function action({ request, params }: any) {
  const userId = await requireUserId(request);
  const { groupId } = params;

  await db.groupChatParticipant.upsert({
    where: { groupChatId_participantId: { groupChatId: groupId, participantId: userId } } as any,
    create: { groupChatId: groupId, participantId: userId, lastReadAt: new Date() },
    update: { lastReadAt: new Date() },
  });

  return { success: true };
}
