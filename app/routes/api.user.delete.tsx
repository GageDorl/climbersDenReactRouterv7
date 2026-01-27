import { requireUserId, logout } from '~/lib/auth.server';
import { db } from '~/lib/db.server';

export async function action({ request }: any) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  const userId = await requireUserId(request);

  try {
    // Soft-delete the user by setting deletedAt so loaders exclude them
    const updated = await db.user.update({ where: { id: userId }, data: { deletedAt: new Date() }, select: { id: true, deletedAt: true } });

    if (!updated || !updated.deletedAt) {
      console.error('Failed to mark user deleted for id:', userId);
      return new Response(JSON.stringify({ error: 'Failed to delete account' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    // Return success JSON; client will call logout to clear session
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('Error deleting user account:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

export async function loader() {
  return new Response(null, { status: 204 });
}
