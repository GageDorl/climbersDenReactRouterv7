import type { Action } from './+types/api.posts.$postId.unhide';
import { redirect } from 'react-router';

export const action: Action = async ({ params, request }) => {
  const { requireAdmin } = await import('~/lib/auth.server');
  const { db } = await import('~/lib/db.server');

  await requireAdmin(request);

  const postId = params.postId;
  if (!postId) throw new Response('missing_postId', { status: 400 });

  await db.post.update({ where: { id: postId }, data: { hidden: false } });

  return redirect('/admin/reports?flash=unhidden');
};

export default () => null;
