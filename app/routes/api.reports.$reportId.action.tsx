import type { Action } from './+types/api.reports.$reportId.action';
import { redirect } from 'react-router';

export const action: Action = async ({ params, request }) => {
  const { requireAdmin } = await import('~/lib/auth.server');
  const { db } = await import('~/lib/db.server');

  await requireAdmin(request);

  const reportId = params.reportId;
  if (!reportId) throw new Response('missing_reportId', { status: 400 });

  const form = await request.formData();
  const act = form.get('action');

  const report = await db.report.findUnique({ where: { id: reportId } });
  if (!report) throw new Response('report_not_found', { status: 404 });

  if (act === 'hide_post') {
    if (report.reportedEntityType !== 'post') {
      throw new Response('invalid_entity', { status: 400 });
    }
    await db.post.update({ where: { id: report.reportedEntityId }, data: { hidden: true } });
    await db.report.update({ where: { id: reportId }, data: { status: 'action_taken', reviewedAt: new Date() } });
    return redirect('/admin/reports?flash=hidden');
  }

  if (act === 'delete_post') {
    if (report.reportedEntityType !== 'post') {
      throw new Response('invalid_entity', { status: 400 });
    }
    await db.post.delete({ where: { id: report.reportedEntityId } });
    await db.report.update({ where: { id: reportId }, data: { status: 'action_taken', reviewedAt: new Date() } });
    return redirect('/admin/reports?flash=deleted');
  }

  if (act === 'dismiss') {
    await db.report.update({ where: { id: reportId }, data: { status: 'dismissed', reviewedAt: new Date() } });
    return redirect('/admin/reports?flash=dismissed');
  }

  throw new Response('invalid_action', { status: 400 });
};

export default () => null;
