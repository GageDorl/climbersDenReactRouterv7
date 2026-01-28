import type { Route } from './+types/api.users.$userId.follow';
import { db } from '~/lib/db.server';
import { requireUser } from '~/lib/auth.server';
import { emitToUser } from '~/lib/realtime.server';

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

    // Create notification for the followed user (respect preferences)
    try {
      const prefs = await (db as any).notificationPreference?.findUnique({ where: { userId } });
      if (!prefs || prefs.follows !== false) {
        const notif = await db.notification.create({
          data: {
            userId: userId,
            type: 'new_follower',
            content: {
              message: `${currentUser.displayName} started following you`,
              followerName: currentUser.displayName,
              followerId: currentUser.id,
            },
            relatedEntityId: currentUser.id,
            relatedEntityType: 'user',
          },
        });
        // emit notification to followed user
        emitToUser(userId, 'notification:new', {
          notification: {
            id: notif.id,
            type: notif.type,
            entityId: notif.relatedEntityId || '',
            message: `${currentUser.displayName} started following you`,
            createdAt: notif.createdAt.toISOString(),
            read: notif.readStatus,
          },
        });
      }
    } catch (err) {
      console.error('Failed to create follow notification', err);
    }

    return new Response(JSON.stringify({ success: true, isFollowing: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
