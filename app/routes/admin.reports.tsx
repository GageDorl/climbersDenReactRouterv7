import { useLoaderData, useLocation } from 'react-router';
import React from 'react';
import type { Loader } from './+types/admin.reports';
import { PageWrapper } from '~/components/ui/page-wrapper';

export const loader: Loader = async ({ request }) => {
  const { requireAdmin } = await import('~/lib/auth.server');
  const { db } = await import('~/lib/db.server');

  await requireAdmin(request);

  const reports = await db.report.findMany({
    orderBy: { createdAt: 'desc' },
    include: { reporter: { select: { id: true, displayName: true } } },
    take: 200,
  });

  // enrich posts
  const enriched = await Promise.all(
    reports.map(async (r) => {
      let reported: any = null;
      if (r.reportedEntityType === 'post') {
        reported = await db.post.findUnique({ where: { id: r.reportedEntityId }, include: { user: { select: { id: true, displayName: true } } } });
      }
      return { ...r, reported };
    })
  );

  const hiddenPosts = await db.post.findMany({
    where: { hidden: true },
    orderBy: { updatedAt: 'desc' },
    include: { user: { select: { id: true, displayName: true } } },
    take: 200,
  });

  return { reports: enriched, hiddenPosts };
};

export default function AdminReportsRoute() {
  const { reports, hiddenPosts } = useLoaderData() as { reports: any[]; hiddenPosts: any[] };
  const [tab, setTab] = React.useState<'reports' | 'hidden'>('reports');
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const flash = params.get('flash');

  return (
    <PageWrapper>
      {flash && (
        <div className="mb-4 p-3 rounded border border-default bg-surface">
          <strong className="text-primary">{flash === 'hidden' ? 'Post hidden' : flash === 'deleted' ? 'Post deleted' : flash === 'dismissed' ? 'Report dismissed' : flash === 'unhidden' ? 'Post unhidden' : ''}</strong>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-primary">Admin</h2>
        <div>
          <button onClick={() => setTab('reports')} className={`px-3 py-1 rounded mr-2 ${tab === 'reports' ? 'btn-primary' : 'btn-secondary'}`}>Reports</button>
          <button onClick={() => setTab('hidden')} className={`px-3 py-1 rounded ${tab === 'hidden' ? 'btn-primary' : 'btn-secondary'}`}>Hidden Posts ({hiddenPosts.length})</button>
        </div>
      </div>

      {tab === 'reports' && (
        <div>
          {reports.length === 0 ? (
            <div className="p-6 bg-secondary rounded-md text-center">No reports</div>
          ) : (
            <ul className="space-y-4">
              {reports.map((r) => (
                <li key={r.id} className="p-4 border border-default rounded-md bg-surface">
                  <div className="text-primary"><strong>Reason:</strong> {r.reason}</div>
                  <div className="text-secondary"><strong>Reporter:</strong> {r.reporter?.displayName}</div>
                  <div className="text-secondary"><strong>Entity:</strong> {r.reportedEntityType} {r.reportedEntityId}</div>
                  {r.reported && (
                    <div className="mt-2">
                      <div className="text-primary"><strong>Post:</strong> {r.reported.textContent ?? '(media)'}</div>
                      <div className="text-secondary"><strong>Author:</strong> {r.reported.user?.displayName}</div>
                    </div>
                  )}

                  <div className="mt-4 space-x-2">
                    <form method="post" action={`/api/reports/${r.id}`} className="inline">
                      <input type="hidden" name="action" value="hide_post" />
                      <button type="submit" className="px-3 py-1 btn-secondary rounded">Hide Post</button>
                    </form>
                    <form method="post" action={`/api/reports/${r.id}`} className="inline">
                      <input type="hidden" name="action" value="delete_post" />
                      <button type="submit" className="px-3 py-1 btn-destructive rounded">Delete Post</button>
                    </form>
                    <form method="post" action={`/api/reports/${r.id}`} className="inline">
                      <input type="hidden" name="action" value="dismiss" />
                      <button type="submit" className="px-3 py-1 btn-primary rounded">Dismiss</button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'hidden' && (
        <div>
          {hiddenPosts.length === 0 ? (
            <div className="p-6 bg-secondary rounded-md text-center">No hidden posts</div>
          ) : (
            <ul className="space-y-4">
              {hiddenPosts.map((p) => (
                <li key={p.id} className="p-4 border border-default rounded-md bg-surface flex items-start justify-between">
                  <div>
                    <div className="text-primary font-semibold">{p.user?.displayName}</div>
                    <div className="text-secondary mt-1">{p.textContent ?? '(media)'}</div>
                    <div className="text-muted text-sm mt-2">ID: {p.id}</div>
                  </div>
                  <div className="ml-4">
                    <form method="post" action={`/api/posts/${p.id}/unhide`}>
                      <button type="submit" className="px-3 py-1 btn-primary rounded">Unhide</button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </PageWrapper>
  );
}
