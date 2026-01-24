import { redirect } from 'react-router';
import type { Route } from './+types/api.posts.$postId.comments.new';
import { getUserId } from '~/lib/auth.server';
import { db } from '~/lib/db.server';
import { z } from 'zod';
import { getSocketIO } from '~/lib/realtime.server';

const createCommentSchema = z.object({
  textContent: z.string().min(1, 'Comment cannot be empty').max(500, 'Comment too long'),
  parentCommentId: z.string().optional().nullable(),
});

export async function action({ params, request }: Route.ActionArgs) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { postId } = params;
  if (!postId) {
    throw new Response('Post ID is required', { status: 400 });
  }

  const userId = await getUserId(request);

  if (!userId) {
    return redirect('/auth/login');
  }

  try {
    const formData = await request.formData();
    const validated = createCommentSchema.parse({
      textContent: formData.get('textContent'),
      parentCommentId: formData.get('parentCommentId') || null,
    });

    // Verify the post exists
    const post = await db.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new Response('Post not found', { status: 404 });
    }

    // If parentCommentId is provided, verify it exists and belongs to the same post
    let finalParentCommentId = validated.parentCommentId;
    if (validated.parentCommentId) {
      const parentComment = await db.comment.findUnique({
        where: { id: validated.parentCommentId },
      });

      if (!parentComment || parentComment.postId !== postId) {
        throw new Response('Parent comment not found', { status: 404 });
      }

      // If the parent comment is itself a reply, use the same parent
      // This keeps all replies at the same nesting level
      if (parentComment.parentCommentId) {
        finalParentCommentId = parentComment.parentCommentId;
      }
    }

    // Create the comment
    const comment = await db.comment.create({
      data: {
        postId,
        userId,
        textContent: validated.textContent,
        parentCommentId: finalParentCommentId || null,
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

    // Update post comment count
    await db.post.update({
      where: { id: postId },
      data: { commentCount: { increment: 1 } },
    });

    // Emit Socket.IO event for real-time updates
    const socketIO = getSocketIO();
    if (socketIO) {
      console.log('[API] Emitting comment:new to room post:', postId);
      console.log('[API] socketIO exists:', !!socketIO);
      console.log('[API] Comment data:', comment.id);
      socketIO.to(`post:${postId}`).emit('comment:new', {
        postId,
        comment: {
          ...comment,
          replies: [],
        },
      });
    } else {
      console.log('[API] socketIO is null! getSocketIO() returned null');
    }

    // Create notification
    const isReply = !!validated.parentCommentId;
    if (isReply) {
      // Notify parent comment author about reply
      const parentComment = await db.comment.findUnique({
        where: { id: validated.parentCommentId },
        select: { userId: true },
      });

      if (parentComment && parentComment.userId !== userId) {
        await db.notification.create({
          data: {
            userId: parentComment.userId,
            type: 'comment_reply',
            relatedEntityId: comment.id,
            relatedEntityType: 'post',
            content: {
              message: `${comment.user.displayName} replied to your comment`,
              commentId: comment.id,
              postId: postId,
            },
          },
        });
      }
    } else {
      // Notify post author about new comment
      const post = await db.post.findUnique({
        where: { id: postId },
        select: { userId: true },
      });

      if (post && post.userId !== userId) {
        await db.notification.create({
          data: {
            userId: post.userId,
            type: 'post_comment',
            relatedEntityId: comment.id,
            relatedEntityType: 'post',
            content: {
              message: `${comment.user.displayName} commented on your post`,
              commentId: comment.id,
              postId: postId,
            },
          },
        });
      }
    }

    return new Response(JSON.stringify({ comment }), { 
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ errors: error.issues }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    console.error('Error creating comment:', error);
    throw new Response('Failed to create comment', { status: 500 });
  }
}
