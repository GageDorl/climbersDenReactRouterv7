import { requireUserId } from "~/lib/auth.server";
import { db } from "~/lib/db.server";

export async function action({ params, request }: any) {
  const userId = await requireUserId(request);
  const { listId } = params;
  if (!listId) return new Response(JSON.stringify({ error: 'List ID required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  const gearList = await db.gearList.findUnique({ where: { id: listId }, select: { id: true, creatorId: true } });
  if (!gearList) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  if (gearList.creatorId !== userId) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });

  const form = await request.formData().catch(() => null);
  if (!form) return new Response(JSON.stringify({ error: 'Invalid form' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  const name = form.get('name')?.toString() || '';
  const description = form.get('description')?.toString() || '';
  const tripDateRaw = form.get('tripDate')?.toString() || '';
  let tripDate: Date | null = null;
  if (tripDateRaw) {
    // Expect YYYY-MM-DD from date input
    const parsed = new Date(tripDateRaw + 'T00:00:00Z');
    if (!isNaN(parsed.getTime())) tripDate = parsed;
  }

  if (!name.trim()) return new Response(JSON.stringify({ error: 'Name required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  await db.gearList.update({ where: { id: listId }, data: { name: name.trim(), description: description.trim(), tripDate: tripDate } });
  return new Response(null, { status: 204 });
}
