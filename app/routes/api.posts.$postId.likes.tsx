import type { Route } from './+types/api.posts.$postId.likes';
import { db } from '~/lib/db.server';
import { getUserId } from '~/lib/auth.server';

export async function loader({ params, request }: Route.LoaderArgs) {
  const userId = await getUserId(request);
  if (!userId) {
    throw new Response('Unauthorized', { status: 401 });
  }

  const postId = params.postId;

  // Get all users who liked this post
  const likes = await db.like.findMany({
    where: { postId },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          profilePhotoUrl: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return {
    users: likes.map(like => like.user),
  };
}
