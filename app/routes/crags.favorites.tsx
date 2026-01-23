import type { Route } from './+types/crags.favorites';
import { Link } from 'react-router';
import { PageWrapper } from '~/components/ui/page-wrapper';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { requireUser } from '~/lib/auth.server';
import { db } from '~/lib/db.server';
import { CragCard } from '~/components/crags/crag-card';

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);

  const favorites = await db.favoriteCrag.findMany({
    where: { userId: user.id },
    include: {
      crag: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Convert Decimal to number for serialization
  const serializedFavorites = favorites.map(fav => ({
    ...fav,
    crag: {
      ...fav.crag,
      latitude: fav.crag.latitude ? Number(fav.crag.latitude) : null,
      longitude: fav.crag.longitude ? Number(fav.crag.longitude) : null,
    },
  }));

  return { favorites: serializedFavorites };
}

export default function CragFavoritesRoute({ loaderData }: Route.ComponentProps) {
  const { favorites } = loaderData;

  return (
    <PageWrapper maxWidth="4xl">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            My Favorite Crags
          </h1>
          <Link
            to="/crags"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Browse all crags →
          </Link>
        </div>

        {favorites.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-3">
                <p className="text-lg text-gray-600 dark:text-gray-400">
                  You haven't favorited any crags yet
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Browse crags and click the heart icon to save your favorites
                </p>
                <Link
                  to="/crags"
                  className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Browse Crags
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {favorites.map(({ crag }) => (
              <CragCard 
                key={crag.id} 
                area={{
                  id: crag.id,
                  uuid: crag.id,
                  name: crag.name,
                  latitude: crag.latitude,
                  longitude: crag.longitude,
                  totalClimbs: crag.totalRouteCount,
                }} 
              />
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
