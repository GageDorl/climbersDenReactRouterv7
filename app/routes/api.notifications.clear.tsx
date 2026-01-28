import type { Route } from "./+types/api.notifications.clear";
import { getUserId } from "~/lib/auth.server";
import { db } from "~/lib/db.server";

export async function action({ request }: Route.ActionArgs) {
  const userId = await getUserId(request);
  if (!userId) return Response.json({ error: 'unauthorized' }, { status: 401 });

  try {
    await db.notification.deleteMany({ where: { userId } });
    return Response.json({ success: true });
  } catch (err) {
    console.error('Failed to clear notifications', err);
    return Response.json({ error: 'failed' }, { status: 500 });
  }
}
