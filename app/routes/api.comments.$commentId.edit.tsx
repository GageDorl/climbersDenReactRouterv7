import { redirect } from 'react-router';
import type { Route } from './+types/api.comments.$commentId.edit';
import { z } from 'zod';
import { db } from '~/lib/db.server';
import { getUserId } from '~/lib/auth.server';
import { realtime } from '~/lib/realtime.server';

const UpdateCommentSchema = z.object({
  textContent: z.string().min(1).max(500),
});

export const action = async ({ request, params }: Route.ActionArgs) => {
  if (request.method !== 'PUT') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const userId = await getUserId(request);
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { commentId } = params;
  if (!commentId) {
    return new Response(JSON.stringify({ error: 'Comment ID required' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const formData = await request.formData();
    const { textContent } = UpdateCommentSchema.parse({
      textContent: formData.get('textContent'),
    });

    // Get comment to verify ownership
    const comment = await db.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return new Response(JSON.stringify({ error: 'Comment not found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (comment.userId !== userId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update comment
    const updated = await db.comment.update({
      where: { id: commentId },
      data: {
        textContent,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            profilePhotoUrl: true,
          },
        },
      },
    });

    // Emit Socket.IO event for real-time updates
    if (realtime.io) {
      realtime.io.to(`post:${comment.postId}`).emit('comment:edited', {
        postId: comment.postId,
        comment: {
          id: updated.id,
          postId: updated.postId,
          userId: updated.userId,
          textContent: updated.textContent,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
          deletedAt: updated.deletedAt?.toISOString() || null,
          parentCommentId: updated.parentCommentId,
          user: updated.user,
          replies: [],
        },
      });
    }

    return new Response(JSON.stringify({ comment: updated }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: 'Invalid input' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    console.error('Error updating comment:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
