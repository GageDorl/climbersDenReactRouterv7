import type { Route } from "./+types/api.routes.$routeId.rating";
import { requireUser } from "~/lib/auth.server";
import { db } from "~/lib/db.server";

export const action = async ({ params, request }: Route.ActionArgs) => {
  if (request.method !== 'POST') {
    throw new Response('Method not allowed', { status: 405 });
  }

  const user = await requireUser(request);
  const routeId = params.routeId as string;

  const formData = await request.formData();
  const starRating = Number(formData.get('starRating'));

  if (!starRating || starRating < 1 || starRating > 5) {
    throw new Response('Invalid rating', { status: 400 });
  }

  // Upsert rating (one rating per user per route)
  const rating = await db.routeRating.upsert({
    where: {
      userId_routeId: {
        userId: user.id,
        routeId,
      },
    },
    create: {
      userId: user.id,
      routeId,
      starRating,
    },
    update: {
      starRating,
    },
  });

  // Recalculate average rating and count for the route
  const allRatings = await db.routeRating.findMany({
    where: { routeId },
  });

  const averageRating =
    allRatings.length > 0
      ? allRatings.reduce((sum, r) => sum + r.starRating, 0) / allRatings.length
      : null;

  await db.route.update({
    where: { id: routeId },
    data: {
      averageRating: averageRating ? averageRating : null,
      ratingCount: allRatings.length,
    },
  });

  return { rating };
};
