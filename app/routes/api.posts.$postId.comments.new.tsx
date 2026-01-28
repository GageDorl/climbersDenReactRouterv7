import { redirect } from 'react-router';
import type { Route } from './+types/api.posts.$postId.comments.new';
import { getUserId } from '~/lib/auth.server';
import { db } from '~/lib/db.server';
import { z } from 'zod';
import { getSocketIO, emitToUser } from '~/lib/realtime.server';

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
      const payloadComment = {
        id: comment.id,
        postId: comment.postId,
        userId: comment.userId,
        textContent: comment.textContent,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
        deletedAt: comment.deletedAt ? comment.deletedAt.toISOString() : null,
        parentCommentId: comment.parentCommentId,
        user: comment.user,
        replies: [],
      };

      socketIO.to(`post:${postId}`).emit('comment:new', {
        postId,
        comment: payloadComment,
      });
    } else {
      console.log('[API] socketIO is null! getSocketIO() returned null');
    }

    // Create notification
    const isReply = !!validated.parentCommentId;
    if (isReply) {
      // Notify parent comment author about reply
      const parentComment = await db.comment.findUnique({
        where: { id: validated.parentCommentId as string },
        select: { userId: true },
      });

      if (parentComment && parentComment.userId !== userId) {
        // check recipient preferences
        const prefs = await (db as any).notificationPreference?.findUnique({ where: { userId: parentComment.userId } });
        if (!prefs || prefs.commentReplies !== false) {
          const notif = await db.notification.create({
            data: {
              userId: parentComment.userId,
              type: 'comment_reply',
              // link to the post, use fragment for the specific comment
              relatedEntityId: postId,
              relatedEntityType: 'post',
              content: {
                message: `${comment.user.displayName} replied to your comment`,
                commentId: comment.id,
                postId: postId,
                fragmentId: comment.id,
              },
            },
          });
          // emit notification to recipient
          emitToUser(parentComment.userId, 'notification:new', {
            notification: {
              id: notif.id,
              type: notif.type,
              entityId: notif.relatedEntityId || '',
              fragmentId: (notif.content as any).fragmentId || null,
              message: (notif.content as any).message,
              createdAt: notif.createdAt.toISOString(),
              read: notif.readStatus,
            },
          });
        }
      }
    } else {
      // Notify post author about new comment
      const post = await db.post.findUnique({
        where: { id: postId },
        select: { userId: true },
      });

      if (post && post.userId !== userId) {
        const prefs = await (db as any).notificationPreference?.findUnique({ where: { userId: post.userId } });
        if (!prefs || prefs.postComments !== false) {
          const notif = await db.notification.create({
            data: {
              userId: post.userId,
              type: 'post_comment',
              relatedEntityId: postId,
              relatedEntityType: 'post',
              content: {
                message: `${comment.user.displayName} commented on your post`,
                commentId: comment.id,
                postId: postId,
                fragmentId: comment.id,
              },
            },
          });
          // emit notification to post author
          emitToUser(post.userId, 'notification:new', {
            notification: {
              id: notif.id,
              type: notif.type,
              entityId: notif.relatedEntityId || '',
              fragmentId: (notif.content as any).fragmentId || null,
              message: (notif.content as any).message,
              createdAt: notif.createdAt.toISOString(),
              read: notif.readStatus,
            },
          });
        }
      }
    }

    return new Response(JSON.stringify({ comment: {
      ...comment,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      replies: [],
    } }), { 
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
