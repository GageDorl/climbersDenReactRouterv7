import { requireUserId } from "~/lib/auth.server";
import { db } from "~/lib/db.server";

export async function action({ params, request }: any) {
  const userId = await requireUserId(request);
  const { listId } = params;
  if (!listId) return new Response(JSON.stringify({ error: 'List ID required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  const gearList = await db.gearList.findUnique({ where: { id: listId } });
  if (!gearList) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  if (gearList.creatorId !== userId) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });

  await db.$transaction(async (tx) => {
    await tx.gearItem.deleteMany({ where: { gearListId: listId } });
    await tx.gearList.delete({ where: { id: listId } });
  });

  return new Response(null, { status: 204 });
}
