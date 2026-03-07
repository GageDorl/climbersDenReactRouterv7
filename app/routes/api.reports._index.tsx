import type { Loader } from './+types/api.reports._index';

export const loader: Loader = async ({ request }) => {
  const { requireAdmin } = await import('~/lib/auth.server');
  const { db } = await import('~/lib/db.server');

  await requireAdmin(request);

  const reports = await db.report.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      reporter: { select: { id: true, displayName: true, profilePhotoUrl: true } },
    },
    take: 200,
  });

  return { reports };
};

export const headers = () => ({ 'Cache-Control': 'no-store' });

export default () => null;
