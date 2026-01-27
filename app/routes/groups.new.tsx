import { requireUserId } from '~/lib/auth.server';
import { db } from '~/lib/db.server';
import { redirect } from 'react-router';

export async function action({ request }: any) {
  const userId = await requireUserId(request);
  const form = await request.formData();
  const name = (form.get('name') as string) || 'New Group';
  const participantsRaw = (form.get('participantIds') as string) || '';
  const participantIds = participantsRaw.split(',').map(s => s.trim()).filter(Boolean);

  // Ensure creator is in participantIds
  if (!participantIds.includes(userId)) participantIds.push(userId);

  const group = await db.groupChat.create({
    data: {
      creatorId: userId,
      participantIds,
      name,
    },
  });

  // Create notifications for invited users
  for (const pid of participantIds) {
    if (pid === userId) continue;
    await db.notification.create({
      data: {
        userId: pid,
        type: 'group_invite',
        relatedEntityId: group.id,
        relatedEntityType: 'group_chat',
        content: { message: `You've been invited to group: ${group.name}` },
        readStatus: false,
      },
    });
  }

  return redirect(`/groups/${group.id}`);
}

export default function NewGroup() {
  return (
    <div className="p-8">
      <h2 className="text-xl">Create group - use API directly for now</h2>
    </div>
  );
}
