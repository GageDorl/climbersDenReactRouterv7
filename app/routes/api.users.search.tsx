import type { Route } from './+types/api.users.search';
import { db } from '~/lib/db.server';
import { getUserId } from '~/lib/auth.server';

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await getUserId(request);
  if (!userId) {
    throw new Response('Unauthorized', { status: 401 });
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim();

  if (q.length < 2) {
    return { users: [] };
  }

  const users = await db.user.findMany({
    where: {
      displayName: {
        contains: q,
        mode: 'insensitive',
      },
      NOT: {
        id: userId,
      },
    },
    select: {
      id: true,
      displayName: true,
      profilePhotoUrl: true,
    },
    take: 10,
  });

  return { users };
}
