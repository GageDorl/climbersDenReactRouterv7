import { redirect } from 'react-router';
import type { Route } from './+types/api.comments.$commentId.delete';
import { getUserId } from '~/lib/auth.server';
import { db } from '~/lib/db.server';
import { realtime } from '~/lib/realtime.server';

export async function action({ params, request }: Route.ActionArgs) {
  if (request.method !== 'DELETE') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { commentId } = params;
  if (!commentId) {
    throw new Response('Comment ID is required', { status: 400 });
  }

  const userId = await getUserId(request);

  if (!userId) {
    return redirect('/auth/login');
  }

  try {
    // Verify the comment exists and belongs to the user
    const comment = await db.comment.findUnique({
      where: { id: commentId },
      include: {
        replies: {
          where: { deletedAt: null },
        },
      },
    });

    if (!comment) {
      throw new Response('Comment not found', { status: 404 });
    }

    if (comment.userId !== userId) {
      throw new Response('Unauthorized', { status: 403 });
    }

    // Count total comments to delete (parent + all replies)
    const replyCount = comment.replies?.length || 0;
    const totalToDelete = 1 + replyCount; // Parent + replies

    // Soft delete the comment and all its replies
    await db.comment.updateMany({
      where: {
        OR: [
          { id: commentId },
          { parentCommentId: commentId },
        ],
      },
      data: { deletedAt: new Date() },
    });

    // Update post comment count by total deleted
    await db.post.update({
      where: { id: comment.postId },
      data: { commentCount: { decrement: totalToDelete } },
    });

    // Emit Socket.IO event for real-time updates
    if (realtime.io) {
      realtime.io.to(`post:${comment.postId}`).emit('comment:deleted', {
        postId: comment.postId,
        commentId,
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw new Response('Failed to delete comment', { status: 500 });
  }
}
