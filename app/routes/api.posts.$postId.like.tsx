import type { Route } from './+types/api.posts.$postId.like';
import { db } from '~/lib/db.server';
import { getUserId } from '~/lib/auth.server';
import { getSocketIO } from '~/lib/realtime.server';

export async function action({ params, request }: Route.ActionArgs) {
  const userId = await getUserId(request);
  if (!userId) {
    throw new Response('Unauthorized', { status: 401 });
  }

  const postId = params.postId;

  // Check if post exists
  const post = await db.post.findUnique({
    where: { id: postId },
  });

  if (!post) {
    throw new Response('Post not found', { status: 404 });
  }

  // Check if user already liked this post
  const existingLike = await db.like.findUnique({
    where: {
      userId_postId: {
        userId,
        postId,
      },
    },
  });

  if (existingLike) {
    // Unlike: Delete the like
    await db.$transaction([
      db.like.delete({
        where: { id: existingLike.id },
      }),
      db.post.update({
        where: { id: postId },
        data: { likeCount: { decrement: 1 } },
      }),
    ]);

    // Emit Socket.IO event for real-time updates
    const socketIO = getSocketIO();
    if (socketIO) {
      socketIO.to(`post:${postId}`).emit('post:like', {
        postId,
        userId,
        liked: false,
        likeCount: (post.likeCount || 0) - 1,
      });
    }

    return Response.json({ liked: false, success: true });
  } else {
    // Like: Create the like
    await db.$transaction([
      db.like.create({
        data: {
          userId,
          postId,
        },
      }),
      db.post.update({
        where: { id: postId },
        data: { likeCount: { increment: 1 } },
      }),
    ]);

    // Emit Socket.IO event for real-time updates
    const socketIO = getSocketIO();
    if (socketIO) {
      socketIO.to(`post:${postId}`).emit('post:like', {
        postId,
        userId,
        liked: true,
        likeCount: (post.likeCount || 0) + 1,
      });
    }

    return Response.json({ liked: true, success: true });
  }
}
