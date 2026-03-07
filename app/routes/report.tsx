import type { Action, Loader } from './+types/report';
import { useLoaderData, redirect } from 'react-router';
import { PageWrapper } from '~/components/ui/page-wrapper';

export const loader: Loader = async ({ request }) => {
  const { requireUser } = await import('~/lib/auth.server');
  const { db } = await import('~/lib/db.server');

  const user = await requireUser(request);
  const url = new URL(request.url);
  const postId = url.searchParams.get('postId');
  if (!postId) throw new Response('missing_postId', { status: 400 });

  const post = await db.post.findUnique({
    where: { id: postId },
    include: { user: { select: { id: true, displayName: true, profilePhotoUrl: true } } },
  });

  if (!post) throw new Response('Post not found', { status: 404 });

  return { post, currentUser: user };
};

export const action: Action = async ({ request }) => {
  const { requireUser } = await import('~/lib/auth.server');
  const { db } = await import('~/lib/db.server');

  const user = await requireUser(request);
  const form = await request.formData();
  const reason = String(form.get('reason') || '').trim();
  const postId = String(form.get('postId') || '').trim();

  if (!postId) throw new Response('missing_postId', { status: 400 });
  if (!reason) throw new Response('missing_reason', { status: 400 });

  await db.report.create({ data: {
    reporterUserId: user.id,
    reportedEntityType: 'post',
    reportedEntityId: postId,
    reason,
  }});

  return redirect(`/posts/${postId}`);
};

export default function ReportPage() {
  const { post } = useLoaderData() as { post: any };

  return (
    <PageWrapper>
      <div className="mb-6">
        <a href={`/posts/${post.id}`} className="link-primary">← Back to Post</a>
        <h1 className="text-2xl font-semibold text-primary mt-4">Report Post</h1>
      </div>

      <div className="p-6 bg-surface rounded-md">
        <div className="mb-4">
          <div className="text-primary font-semibold">Author: {post.user.displayName}</div>
          <div className="text-secondary mt-2">{post.textContent ?? '(media)'}</div>
        </div>

        <form method="post">
          <input type="hidden" name="postId" value={post.id} />
          <div className="mb-4">
            <label className="block text-sm font-medium text-primary">Reason</label>
            <textarea name="reason" rows={4} className="w-full mt-2 p-2 border border-default rounded" placeholder="Explain why you're reporting this post"></textarea>
          </div>
          <div>
            <button type="submit" className="px-4 py-2 btn-destructive rounded">Submit Report</button>
          </div>
        </form>
      </div>
    </PageWrapper>
  );
}
