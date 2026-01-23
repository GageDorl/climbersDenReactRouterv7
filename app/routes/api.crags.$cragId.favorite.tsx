import type { Route } from './+types/api.crags.$cragId.favorite';
import { requireUser } from '~/lib/auth.server';
import { db } from '~/lib/db.server';
import { getAreaWithClimbs } from '~/lib/openbeta.server';

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireUser(request);
  const { cragId } = params;

  if (!cragId) {
    throw new Response('Crag ID is required', { status: 400 });
  }

  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'favorite') {
    // Fetch area data from OpenBeta
    const area = await getAreaWithClimbs(cragId);
    if (!area) {
      throw new Response('Crag not found', { status: 404 });
    }

    // Create or update Crag record in our database
    await db.crag.upsert({
      where: { id: cragId },
      create: {
        id: cragId,
        name: area.name,
        latitude: area.latitude,
        longitude: area.longitude,
        totalRouteCount: area.totalClimbs,
      },
      update: {
        name: area.name,
        latitude: area.latitude,
        longitude: area.longitude,
        totalRouteCount: area.totalClimbs,
      },
    });

    // Check if already favorited
    const existing = await db.favoriteCrag.findUnique({
      where: {
        userId_cragId: {
          userId: user.id,
          cragId,
        },
      },
    });

    if (!existing) {
      await db.favoriteCrag.create({
        data: {
          userId: user.id,
          cragId,
        },
      });
    }

    return Response.json({ favorited: true });
  } else if (intent === 'unfavorite') {
    await db.favoriteCrag.deleteMany({
      where: {
        userId: user.id,
        cragId,
      },
    });

    return Response.json({ favorited: false });
  }

  throw new Response('Invalid intent', { status: 400 });
}
