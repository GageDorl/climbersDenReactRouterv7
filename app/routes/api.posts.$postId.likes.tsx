import type { Route } from './+types/api.posts.$postId.likes';
import { db } from '~/lib/db.server';
import { getUserId } from '~/lib/auth.server';

export async function loader({ params, request }: Route.LoaderArgs) {
  const userId = await getUserId(request);
  if (!userId) {
    throw new Response('Unauthorized', { status: 401 });
  }

  const postId = params.postId;

  if (!postId) {
    throw new Response('Post ID is required', { status: 400 });
  }

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

  const likedUserIds = likes
    .map(like => like.user.id)
    .filter(id => id !== userId);

  const following = likedUserIds.length
    ? await db.follow.findMany({
        where: {
          followerId: userId,
          followedId: { in: likedUserIds },
        },
        select: { followedId: true },
      })
    : [];

  const followingSet = new Set(following.map(f => f.followedId));

  return {
    users: likes.map(like => ({
      ...like.user,
      isCurrentUser: like.user.id === userId,
      isFollowing: followingSet.has(like.user.id),
    })),
  };
}
