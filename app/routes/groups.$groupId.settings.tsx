import { requireUserId } from '~/lib/auth.server';
import { db } from '~/lib/db.server';
import { PageWrapper } from '~/components/ui/page-wrapper';
import { redirect, Link } from 'react-router';

export async function loader({ request, params }: any) {
  const userId = await requireUserId(request);
  const { groupId } = params;
  const group = await db.groupChat.findUnique({ where: { id: groupId } });
  if (!group) throw new Response('Group not found', { status: 404 });
  if (!group.participantIds.includes(userId)) throw new Response('Unauthorized', { status: 403 });

  const participants = await db.user.findMany({ where: { id: { in: group.participantIds } }, select: { id: true, displayName: true, profilePhotoUrl: true } });
  const gearLists = await db.gearList.findMany({ where: { groupId } });

  return { group, participants, userId, gearLists };
}

export async function action({ request, params }: any) {
  const userId = await requireUserId(request);
  const { groupId } = params;
  const form = await request.formData();
  const action = form.get('_action') as string | null;

  const group = await db.groupChat.findUnique({ where: { id: groupId } });
  if (!group) throw new Response('Group not found', { status: 404 });
  if (!group.participantIds.includes(userId)) throw new Response('Unauthorized', { status: 403 });

  if (action === 'change-name') {
    const name = (form.get('name') as string) || group.name;
    await db.groupChat.update({ where: { id: groupId }, data: { name } });
    return redirect(`/groups/${groupId}/settings`);
  }

  if (action === 'add-participant') {
    const displayName = (form.get('displayName') as string || '').trim();
    if (!displayName) return redirect(`/groups/${groupId}/settings`);
    const userToAdd = await db.user.findUnique({ where: { displayName } });
    if (!userToAdd) throw new Response('User not found', { status: 404 });

    if (!group.participantIds.includes(userToAdd.id)) {
      const updated = [...group.participantIds, userToAdd.id];
      await db.groupChat.update({ where: { id: groupId }, data: { participantIds: updated } });
      await db.groupChatParticipant.upsert({
        where: { groupChatId_participantId: { groupChatId: groupId, participantId: userToAdd.id } } as any,
        create: { groupChatId: groupId, participantId: userToAdd.id, lastReadAt: null },
        update: {},
      });
    }

    return redirect(`/groups/${groupId}/settings`);
  }

  if (action === 'remove-participant') {
    const participantId = form.get('participantId') as string;
    if (!participantId) return redirect(`/groups/${groupId}/settings`);
    // Only allow the group creator to remove other participants. Any participant may remove themselves.
    if (participantId !== userId && userId !== group.creatorId) {
      throw new Response('Forbidden', { status: 403 });
    }
    const remaining = group.participantIds.filter((p: string) => p !== participantId);
    await db.groupChat.update({ where: { id: groupId }, data: { participantIds: remaining } });
    await db.groupChatParticipant.deleteMany({ where: { groupChatId: groupId, participantId } });
    // If user removed themselves, redirect to messages
    if (participantId === userId) return redirect('/messages');
    return redirect(`/groups/${groupId}/settings`);
  }

  if (action === 'leave') {
    const remaining = group.participantIds.filter((p: string) => p !== userId);
    await db.groupChat.update({ where: { id: groupId }, data: { participantIds: remaining } });
    await db.groupChatParticipant.deleteMany({ where: { groupChatId: groupId, participantId: userId } });
    return redirect('/messages');
  }

  if (action === 'create-gearlist') {
    const name = (form.get('gearName') as string) || `${group.name} Gear List`;
    const gear = await db.gearList.create({
      data: { creatorId: userId, name, participantIds: group.participantIds, groupId },
    });
    return redirect(`/gear/${gear.id}`);
  }

  if (action === 'plan-trip') {
    // Redirect to a trip planner (not implemented) with group context
    return redirect(`/trips/new?groupId=${encodeURIComponent(groupId)}`);
  }

  return redirect(`/groups/${groupId}/settings`);
}

export default function GroupSettings({ loaderData }: any) {
  const { group, participants, userId, gearLists } = loaderData;

  return (
    <PageWrapper maxWidth="3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Group Settings</h1>
          <div className="text-sm text-secondary">{group.name}</div>
        </div>
        <div>
          <Link to={`/groups/${group.id}`} className="rounded-lg px-3 py-2 text-sm text-secondary hover:bg-secondary">Back</Link>
        </div>
      </div>

      <div className="space-y-6">
        <section className="rounded-lg bg-secondary p-4">
          <h2 className="text-lg font-semibold text-primary">Name</h2>
          <form method="post" className="mt-2 flex space-x-2">
            <input defaultValue={group.name} name="name" className="flex-1 rounded-md border p-2 bg-surface" />
            <input type="hidden" name="_action" value="change-name" />
            <button className="btn-primary px-4 py-2">Save</button>
          </form>
        </section>

        <section className="rounded-lg bg-secondary p-4">
          <h2 className="text-lg font-semibold text-primary">Participants</h2>
          <div className="mt-2 space-y-2">
            {participants.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between rounded-md p-2 bg-surface">
                <div className="flex items-center space-x-3">
                  {p.profilePhotoUrl ? (
                    <img src={p.profilePhotoUrl} alt={p.displayName} className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gray-400" />
                  )}
                  <div>{p.displayName}</div>
                </div>
                <div>
                  {p.id === userId ? (
                    <form method="post" className="inline">
                      <input type="hidden" name="_action" value="leave" />
                      <button className="text-sm text-red-600">Leave Group</button>
                    </form>
                  ) : (
                    // Only group creator may remove other participants
                    userId === group.creatorId ? (
                      <form method="post" className="inline">
                        <input type="hidden" name="_action" value="remove-participant" />
                        <input type="hidden" name="participantId" value={p.id} />
                        <button className="text-sm text-red-600">Remove</button>
                      </form>
                    ) : (
                      <div className="text-sm text-secondary">Member</div>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <h3 className="text-sm font-medium text-primary">Add by display name</h3>
            <form method="post" className="mt-2 flex space-x-2">
              <input name="displayName" placeholder="exact display name" className="flex-1 rounded-md border p-2 bg-surface" />
              <input type="hidden" name="_action" value="add-participant" />
              <button className="btn-primary px-4 py-2">Add</button>
            </form>
          </div>
        </section>

        <section className="rounded-lg bg-secondary p-4">
          <h2 className="text-lg font-semibold text-primary">Plan Trip</h2>
          <div className="mt-2 space-y-2">
            <form method="post" className="flex flex-col gap-2 space-x-2">
              <input name="gearName" placeholder="Trip / gear list name (optional)" className="flex-1 rounded-md border p-2 bg-surface" />
              <input type="hidden" name="_action" value="create-gearlist" />
              <button className="btn-primary px-4 py-2 grow">Plan Trip With Group</button>
            </form>
          </div>
        </section>

        <section className="rounded-lg bg-secondary p-4">
          <h2 className="text-lg font-semibold text-primary">Group Gear Lists</h2>
          <div className="mt-2 space-y-2">
            {gearLists && gearLists.length > 0 ? (
              gearLists.map((g: any) => (
                <Link key={g.id} to={`/gear/${g.id}`} className="block rounded-md p-2 bg-surface">{g.name}</Link>
              ))
            ) : (
              <div className="text-sm text-secondary">No gear lists created for this group.</div>
            )}
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}
