import type { Route } from './+types/api.users.$userId.follow';
import { db } from '~/lib/db.server';
import { requireUser } from '~/lib/auth.server';

export async function action({ params, request }: Route.ActionArgs) {
  const currentUser = await requireUser(request);
  const { userId } = params;

  if (!userId) {
    throw new Response('User ID is required', { status: 400 });
  }

  // Prevent self-follow
  if (userId === currentUser.id) {
    throw new Response('You cannot follow yourself', { status: 400 });
  }

  // Check if target user exists
  const targetUser = await db.user.findUnique({
    where: { id: userId },
  });

  if (!targetUser || targetUser.deletedAt) {
    throw new Response('User not found', { status: 404 });
  }

  // Check if already following
  const existingFollow = await db.follow.findUnique({
    where: {
      followerId_followedId: {
        followerId: currentUser.id,
        followedId: userId,
      },
    },
  });

  if (existingFollow) {
    // Unfollow
    await db.follow.delete({
      where: {
        id: existingFollow.id,
      },
    });

    return new Response(JSON.stringify({ success: true, isFollowing: false }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } else {
    // Follow
    await db.follow.create({
      data: {
        followerId: currentUser.id,
        followedId: userId,
      },
    });

    // Create notification for the followed user
    await db.notification.create({
      data: {
        userId: userId,
        type: 'new_follower',
        content: {
          followerName: currentUser.displayName,
          followerId: currentUser.id,
        },
        relatedEntityId: currentUser.id,
        relatedEntityType: 'user',
      },
    });

    return new Response(JSON.stringify({ success: true, isFollowing: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
