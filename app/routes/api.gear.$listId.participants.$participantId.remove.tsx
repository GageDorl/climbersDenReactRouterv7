import { requireUserId } from '~/lib/auth.server';
import { db } from '~/lib/db.server';
import { emitToGearList, emitToUser } from '~/lib/realtime.server';

export async function action({ params, request }: any) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  const userId = await requireUserId(request);
  const { listId, participantId } = params;
  if (!listId || !participantId) return new Response(JSON.stringify({ error: 'Missing params' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  const gearList = await db.gearList.findUnique({ where: { id: listId } });
  if (!gearList) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  if (gearList.creatorId !== userId) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  // Do not allow removing the creator from their own list
  if (participantId === gearList.creatorId) {
    return new Response(JSON.stringify({ error: 'Cannot remove list owner' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  let updatedList: any = null;

  await db.$transaction(async (tx) => {
    // remove participantId from list
    const current = gearList.participantIds || [];
    const newParticipants = current.filter((id) => id !== participantId);
    updatedList = await tx.gearList.update({ where: { id: listId }, data: { participantIds: newParticipants } });

    // find all gear items in list that the user claimed
    const items = await tx.gearItem.findMany({ where: { gearListId: listId } });
    for (const it of items) {
      const claimed = it.claimedByUserIds || [];
      const occurrences = claimed.filter((id) => id === participantId).length;
      if (occurrences > 0) {
        // remove all occurrences
        const newClaimed: string[] = [];
        let removed = 0;
        for (const id of claimed) {
          if (id === participantId && removed < occurrences) {
            removed += 1;
            continue;
          }
          newClaimed.push(id);
        }
        await tx.gearItem.update({ where: { id: it.id }, data: { claimedByUserIds: newClaimed, quantityClaimed: { decrement: removed } } });

        // emit realtime update for this item to the gear room
        const counts = newClaimed.reduce<Record<string, number>>((acc, id) => { acc[id] = (acc[id] || 0) + 1; return acc; }, {} as Record<string, number>);
        const userIds = Object.keys(counts);
        const users = userIds.length > 0 ? await tx.user.findMany({ where: { id: { in: userIds } }, select: { id: true, displayName: true, profilePhotoUrl: true } }) : [];
        const claimedByUsers = users.map(u => ({ id: u.id, displayName: u.displayName, profilePhotoUrl: u.profilePhotoUrl, quantity: counts[u.id] || 0 }));

        emitToGearList(listId, 'gear:unclaimed', {
          gearListId: listId,
          itemId: it.id,
          itemName: it.itemName,
          quantityNeeded: it.quantityNeeded,
          quantityClaimed: Math.max(0, it.quantityClaimed - removed),
          claimedByUsers,
          userId: participantId,
        });
      }
    }
  });

  // Optionally notify the removed user
  const removedUser = await db.user.findUnique({ where: { id: participantId }, select: { id: true, displayName: true } });
  if (removedUser) {
    await db.notification.create({
      data: {
        userId: participantId,
        type: 'gear_claimed',
        relatedEntityId: listId,
        relatedEntityType: 'gear_list',
        content: { message: `You were removed from list ${(gearList && gearList.name) || ''}` },
      },
    });
    // emit notification to removed user
    emitToUser(participantId, 'notification:new', {
      notification: {
        id: '',
        type: 'gear_claimed',
        entityId: listId,
        message: `You were removed from list ${(gearList && gearList.name) || ''}`,
        createdAt: new Date().toISOString(),
        read: false,
      },
    });
  }

  return new Response(null, { status: 204 });
}
