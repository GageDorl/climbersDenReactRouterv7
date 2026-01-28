import type { Route } from "./+types/api.notifications.$notificationId.read";
import { getUserId } from "~/lib/auth.server";
import { db } from "~/lib/db.server";

export async function action({ request, params }: Route.ActionArgs) {
  const userId = await getUserId(request);
  if (!userId) return Response.json({ error: 'unauthorized' }, { status: 401 });

  const { notificationId } = params;
  if (!notificationId) return Response.json({ error: 'missing_id' }, { status: 400 });

  // Ensure notification belongs to user
  const notif = await db.notification.findUnique({ where: { id: notificationId } });
  if (!notif || notif.userId !== userId) return Response.json({ error: 'forbidden' }, { status: 403 });

  await db.notification.update({ where: { id: notificationId }, data: { readStatus: true } });

  return Response.json({ success: true });
}
