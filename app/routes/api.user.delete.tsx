import { requireUserId, logout } from '~/lib/auth.server';
import { db } from '~/lib/db.server';

export async function action({ request }: any) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  const userId = await requireUserId(request);

  // Soft-delete the user by setting deletedAt so loaders exclude them
  await db.user.update({ where: { id: userId }, data: { deletedAt: new Date() } });

  // Destroy session and redirect to login
  return logout(request);
}

export async function loader() {
  return new Response(null, { status: 204 });
}
