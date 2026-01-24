import { getUserId } from '~/lib/auth.server';
import { db } from '~/lib/db.server';
import { emitToGearList, emitToUser } from '~/lib/realtime.server';

export async function action({ params, request }: any) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  const userId = await getUserId(request);
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const { itemId } = params;
  if (!itemId) {
    return new Response(JSON.stringify({ error: 'Item ID required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const item = await db.gearItem.findUnique({ where: { id: itemId } });
    if (!item) {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const gearListId = item.gearListId;

    // Parse requested quantity from JSON body or form data. Default behavior: toggle 1 unit.
    let requestedQuantity: number | null = null;
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        const body = await request.json().catch(() => null);
        if (body && typeof body.quantity === 'number') {
          requestedQuantity = Math.max(0, Math.floor(body.quantity));
        } else if (body && typeof body.quantity === 'string') {
          const n = parseInt(body.quantity, 10);
          if (!Number.isNaN(n)) requestedQuantity = Math.max(0, Math.floor(n));
        }
      } catch (e) {
        requestedQuantity = null;
      }
    } else {
      const form = await request.formData().catch(() => null);
      if (form) {
        const q = form.get('quantity')?.toString();
        if (q !== undefined && q !== null) {
          const n = parseInt(q, 10);
          if (!Number.isNaN(n)) requestedQuantity = Math.max(0, Math.floor(n));
        }
      }
    }

    let updatedItem: any = null;

    await db.$transaction(async (tx) => {
      const fresh = await tx.gearItem.findUnique({ where: { id: itemId } });
      if (!fresh) throw new Error('Item disappeared');

      const freshClaimed = fresh.claimedByUserIds || [];
      const totalClaimed = freshClaimed.length;
      const userExistingCount = freshClaimed.filter((id) => id === userId).length;

      // Determine desired quantity for this user
      let desiredQuantity: number;
      if (requestedQuantity === null) {
        // default toggle: if user has none, try to claim 1; otherwise unclaim all (set to 0)
        desiredQuantity = userExistingCount > 0 ? 0 : 1;
      } else {
        desiredQuantity = requestedQuantity;
      }

      if (desiredQuantity < 0) desiredQuantity = 0;
      if (desiredQuantity > fresh.quantityNeeded) desiredQuantity = fresh.quantityNeeded;

      if (desiredQuantity === userExistingCount) {
        // no-op
        updatedItem = fresh;
        return;
      }

      if (desiredQuantity > userExistingCount) {
        const delta = desiredQuantity - userExistingCount;
        if (totalClaimed + delta > fresh.quantityNeeded) {
          throw new Response(JSON.stringify({ error: 'Not enough items remaining to claim' }), { status: 409, headers: { 'Content-Type': 'application/json' } });
        }
        const newClaimed = [...freshClaimed, ...Array(delta).fill(userId)];
        updatedItem = await tx.gearItem.update({ where: { id: itemId }, data: { claimedByUserIds: newClaimed, quantityClaimed: { increment: delta } } });
      } else {
        // desired < existing -> remove occurrences
        const delta = userExistingCount - desiredQuantity;
        // remove 'delta' occurrences of userId from freshClaimed
        let removed = 0;
        const newClaimed: string[] = [];
        for (const id of freshClaimed) {
          if (id === userId && removed < delta) {
            removed += 1;
            continue;
          }
          newClaimed.push(id);
        }
        updatedItem = await tx.gearItem.update({ where: { id: itemId }, data: { claimedByUserIds: newClaimed, quantityClaimed: { decrement: delta } } });
      }
    });

    // Ensure updatedItem exists
    if (!updatedItem) {
      return new Response(JSON.stringify({ error: 'Could not update item' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    // Build claimedByUsers mapping with counts and display names
    const claimedArr: string[] = (updatedItem as any).claimedByUserIds || [];
    const counts = claimedArr.reduce<Record<string, number>>((acc, id) => { acc[id] = (acc[id] || 0) + 1; return acc; }, {} as Record<string, number>);
    const userIds = Object.keys(counts);
    const users = userIds.length > 0 ? await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, displayName: true, profilePhotoUrl: true } }) : [];
    const claimedByUsers = users.map(u => ({ id: u.id, displayName: u.displayName, profilePhotoUrl: u.profilePhotoUrl, quantity: counts[u.id] || 0 }));

    // Emit real-time event to gear room with richer payload
    emitToGearList(gearListId, 'gear:claimed', {
      gearListId,
      itemId: (updatedItem as any).id,
      itemName: (updatedItem as any).itemName,
      quantityNeeded: (updatedItem as any).quantityNeeded,
      quantityClaimed: (updatedItem as any).quantityClaimed,
      claimedByUsers,
      userId,
    });

    // Create a notification for the gear list creator (if not the claimer)
    const gearList = await db.gearList.findUnique({ where: { id: gearListId }, select: { creatorId: true } });
    if (gearList && gearList.creatorId !== userId) {
      const user = await db.user.findUnique({ where: { id: userId }, select: { displayName: true } });
      const notif = await db.notification.create({
        data: {
          userId: gearList.creatorId,
          type: 'gear_claimed',
          relatedEntityId: (updatedItem as any).id,
          relatedEntityType: 'gear_list',
          content: {
            message: `${user?.displayName || 'Someone'} updated claims for ${(updatedItem as any).itemName}`,
            itemId: (updatedItem as any).id,
            gearListId,
          },
        },
      });

      // Emit notification to creator
      emitToUser(gearList.creatorId, 'notification:new', {
        notification: {
          id: notif.id,
          type: notif.type,
          entityId: notif.relatedEntityId || '',
          message: (notif.content as any).message,
          createdAt: notif.createdAt.toISOString(),
          read: notif.readStatus,
        },
      });
    }

    return new Response(JSON.stringify({ item: { ...(updatedItem as any), updatedAt: (updatedItem as any).updatedAt?.toISOString() }, claimedByUsers }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    if (err instanceof Response) return err as Response;
    console.error('Error claiming gear item:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

