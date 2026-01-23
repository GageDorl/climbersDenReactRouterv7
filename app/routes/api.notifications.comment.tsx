import type { Route } from './+types/api.notifications.comment';
import { db } from '~/lib/db.server';
import { getUserId } from '~/lib/auth.server';

// Action to emit comment notifications
export const action = async ({ request }: Route.ActionArgs) => {
  if (request.method !== 'POST') {
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

  try {
    const body = await request.json();
    const { commentId, postId, type } = body;

    if (!commentId || !postId || !type) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get comment and post info
    const comment = await db.comment.findUnique({
      where: { id: commentId },
      include: { user: true },
    });

    if (!comment) {
      return new Response(JSON.stringify({ error: 'Comment not found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const post = await db.post.findUnique({
      where: { id: postId },
      select: { userId: true },
    });

    if (!post) {
      return new Response(JSON.stringify({ error: 'Post not found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create notification based on type
    let notificationUserId: string | null = null;
    let notificationMessage = '';

    if (type === 'comment' && comment.userId !== post.userId) {
      // Notify post author about new comment
      notificationUserId = post.userId;
      notificationMessage = `${comment.user.displayName} commented on your post`;
    } else if (type === 'reply' && comment.parentCommentId) {
      // Notify parent comment author about reply
      const parentComment = await db.comment.findUnique({
        where: { id: comment.parentCommentId },
        select: { userId: true },
      });

      if (parentComment && parentComment.userId !== comment.userId) {
        notificationUserId = parentComment.userId;
        notificationMessage = `${comment.user.displayName} replied to your comment`;
      }
    }

    if (notificationUserId) {
      await db.notification.create({
        data: {
          userId: notificationUserId,
          type: type === 'reply' ? 'comment_reply' : 'post_comment',
          relatedEntityId: commentId,
          relatedEntityType: 'post',
          content: {
            message: notificationMessage,
            commentId: commentId,
            postId: postId,
          },
        },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
