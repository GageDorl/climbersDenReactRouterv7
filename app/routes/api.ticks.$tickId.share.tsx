import type { Route } from "./+types/api.ticks.$tickId.share";
import { requireUser } from "~/lib/auth.server";
import { db } from "~/lib/db.server";

export const action = async ({ params, request }: Route.ActionArgs) => {
  if (request.method !== 'POST') {
    throw new Response('Method not allowed', { status: 405 });
  }

  const user = await requireUser(request);
  const tickId = params.tickId as string;

  const tick = await db.tick.findFirst({
    where: {
      id: tickId,
      userId: user.id,
    },
    include: {
      route: {
        select: {
          id: true,
          name: true,
          grade: true,
          type: true,
          crag: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!tick) {
    throw new Response('Tick not found', { status: 404 });
  }

  // Create post from tick data
  const post = await db.post.create({
    data: {
      userId: user.id,
      textContent: `Just climbed ${tick.route.name} (${tick.route.grade}) at ${tick.route.crag.name} as a ${tick.sendStyle}!`,
      mediaUrls: [],
    },
  });

  return { postId: post.id };
};
