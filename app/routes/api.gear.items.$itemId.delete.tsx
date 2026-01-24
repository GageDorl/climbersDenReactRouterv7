import { requireUserId } from "~/lib/auth.server";
import { db } from "~/lib/db.server";

export async function action({ params, request }: any) {
  const userId = await requireUserId(request);
  const { itemId } = params;
  if (!itemId) return new Response(JSON.stringify({ error: 'Item ID required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  const item = await db.gearItem.findUnique({ where: { id: itemId } });
  if (!item) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

  const gearList = await db.gearList.findUnique({ where: { id: item.gearListId }, select: { id: true, creatorId: true } });
  if (!gearList) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  if (gearList.creatorId !== userId) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });

  await db.gearItem.delete({ where: { id: itemId } });
  return new Response(null, { status: 204 });
}
