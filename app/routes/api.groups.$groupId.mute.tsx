import { requireUserId } from '~/lib/auth.server';
import { db } from '~/lib/db.server';

// NOTE: This implementation stores a simple Notification entry as a lightweight
// record of muted groups for the user. A proper implementation should add a
// dedicated muted_groups table or a JSON column on User with migrations.

export async function action({ request, params }: any) {
  const userId = await requireUserId(request);
  const { groupId } = params;
  const form = await request.formData();
  const mode = (form.get('mode') as string) || 'mute'; // 'mute' or 'unmute'

  const where = { groupChatId_participantId: { groupChatId: groupId, participantId: userId } } as any;

  if (mode === 'mute') {
    await db.groupChatParticipant.upsert({
      where,
      create: { groupChatId: groupId, participantId: userId, muted: true },
      update: { muted: true },
    });
  } else {
    await db.groupChatParticipant.upsert({
      where,
      create: { groupChatId: groupId, participantId: userId, muted: false },
      update: { muted: false },
    });
  }

  return { success: true };
}
