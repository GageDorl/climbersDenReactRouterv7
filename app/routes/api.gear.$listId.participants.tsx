import { requireUserId } from '~/lib/auth.server';
import { db } from '~/lib/db.server';

export async function action({ params, request }: any) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  const userId = await requireUserId(request);
  const { listId } = params;
  if (!listId) return new Response(JSON.stringify({ error: 'List ID required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  const form = await request.formData().catch(() => null);
  const participantId = form?.get('participantId')?.toString();
  if (!participantId) return new Response(JSON.stringify({ error: 'participantId required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  // Ensure list exists and only creator can add participants
  const gearList = await db.gearList.findUnique({ where: { id: listId } });
  if (!gearList) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  if (gearList.creatorId !== userId) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });

  // ensure user exists
  const user = await db.user.findUnique({ where: { id: participantId } });
  if (!user) return new Response(JSON.stringify({ error: 'User not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

  // add to participantIds if not already present
  const current = gearList.participantIds || [];
  if (!current.includes(participantId)) {
    await db.gearList.update({ where: { id: listId }, data: { participantIds: { push: participantId } } });
  }

  return new Response(null, { status: 204 });
}
