import { redirect } from 'react-router';
import type { Route } from './+types/api.posts.$postId.delete';
import { db } from '~/lib/db.server';
import { getUserId } from '~/lib/auth.server';

export async function action({ params, request }: Route.ActionArgs) {
  const userId = await getUserId(request);
  if (!userId) {
    throw new Response('Unauthorized', { status: 401 });
  }

  const postId = params.postId;

  // Check if post exists and belongs to current user
  const post = await db.post.findUnique({
    where: { id: postId },
    select: { userId: true },
  });

  if (!post) {
    throw new Response('Post not found', { status: 404 });
  }

  if (post.userId !== userId) {
    throw new Response('Forbidden - You can only delete your own posts', { status: 403 });
  }

  // Delete the post (cascade will handle likes)
  await db.post.delete({
    where: { id: postId },
  });

  return redirect('/posts');
}
