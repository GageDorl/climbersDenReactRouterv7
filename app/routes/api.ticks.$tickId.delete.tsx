import type { Route } from "./+types/api.ticks.$tickId.delete";
import { requireUser } from "~/lib/auth.server";
import { db } from "~/lib/db.server";

export const action = async ({ params, request }: Route.ActionArgs) => {
  if (request.method !== 'DELETE') {
    throw new Response('Method not allowed', { status: 405 });
  }

  const user = await requireUser(request);
  const tickId = params.tickId as string;

  const tick = await db.tick.findFirst({
    where: {
      id: tickId,
      userId: user.id,
    },
  });

  if (!tick) {
    throw new Response('Tick not found', { status: 404 });
  }

  // Delete the tick
  await db.tick.delete({
    where: { id: tickId },
  });

  return { success: true };
};
