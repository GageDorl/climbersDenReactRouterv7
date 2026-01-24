import { requireUserId } from "~/lib/auth.server";
import { db } from "~/lib/db.server";

export async function action({ params, request }: any) {
  const userId = await requireUserId(request);
  const { listId } = params;
  if (!listId) return new Response('Not Found', { status: 404 });

  const form = await request.formData();
  const itemName = form.get('itemName')?.toString() || '';
  const quantityNeeded = parseInt(form.get('quantityNeeded')?.toString() || '1', 10) || 1;
  const notes = form.get('notes')?.toString() || null;

  if (!itemName.trim()) return new Response('Item name required', { status: 400 });

  await db.gearItem.create({
    data: {
      gearListId: listId,
      itemName: itemName.trim(),
      quantityNeeded,
      notes,
      claimedByUserIds: [],
    },
  });

  return new Response(null, { status: 204 });
}
