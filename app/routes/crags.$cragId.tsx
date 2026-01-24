import type { Route } from './+types/crags.$cragId';
import { Link } from 'react-router';
import { PageWrapper } from '~/components/ui/page-wrapper';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { getAreaWithClimbs } from '~/lib/openbeta.server';
import { getWeatherForecast } from '~/lib/weather.server';
import { RouteList } from '~/components/crags/route-list';
import { WeatherWidget } from '~/components/weather/weather-widget';
import { FavoriteButton } from '~/components/crags/favorite-button';
import { getUser } from '~/lib/auth.server';
import { db } from '~/lib/db.server';
import { calculateDistance, formatDistance } from '~/lib/geo-utils';

export async function loader({ params, request }: Route.LoaderArgs) {
  const uuid = params.cragId;
  if (!uuid) {
    throw new Response('Crag ID is required', { status: 400 });
  }
  const area = await getAreaWithClimbs(uuid);
  if (!area) {
    throw new Response('Crag not found', { status: 404 });
  }

  let weather: Awaited<ReturnType<typeof getWeatherForecast>> | null = null;
  // Only fetch weather for top-level areas (no ancestors) to save API tokens
  if (area.climbs.length !== 0 && area.latitude != null && area.longitude != null) {
    try {
      weather = await getWeatherForecast(area.latitude, area.longitude);
    } catch (err) {
      weather = null;
      console.error('Failed to fetch weather', err);
    }
  }

  // Check if user has favorited this crag
  const user = await getUser(request);
  let isFavorited = false;
  let distance: string | null = null;

  if (user) {
    const favorite = await db.favoriteCrag.findUnique({
      where: {
        userId_cragId: {
          userId: user.id,
          cragId: uuid,
        },
      },
    });
    isFavorited = !!favorite;

    // Calculate distance if user has location and crag has coordinates
    if (
      user.latitude &&
      user.longitude &&
      area.latitude != null &&
      area.longitude != null
    ) {
      const distanceMiles = calculateDistance(
        Number(user.latitude),
        Number(user.longitude),
        area.latitude,
        area.longitude
      );
      distance = formatDistance(distanceMiles);
    }
  }

  return { area, weather, isFavorited, distance, isLoggedIn: !!user };
}

function formatCoords(lat: number | null, lng: number | null) {
  if (lat == null || lng == null) return 'Coords unavailable';
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

function formatName(name: string) {
    return name.substring(name.length - 5, name.length) === ', The' ? `The ${name.substring(0, name.length - 5)}` : name;
}

export default function CragDetailsRoute({ loaderData }: Route.ComponentProps) {
  const { area, weather, isFavorited, distance, isLoggedIn } = loaderData;

  return (
    <PageWrapper maxWidth="4xl">
      <div className="space-y-6">
        {/* Breadcrumb navigation */}
        <div className="flex items-center gap-2 text-sm text-secondary">
          <Link to="/crags" className="link-primary">
            Search
          </Link>
          {area.ancestors.length > 0 && (
            <>
              {area.ancestors.map((ancestor) => (
                <span key={ancestor.uuid} className="flex items-center gap-2">
                  <span>›</span>
                  <Link
                    to={`/crags/${ancestor.uuid}`}
                    className="link-primary"
                  >
                    {formatName(ancestor.name)}
                  </Link>
                </span>
              ))}
              <span>›</span>
            </>
          )}
          <span className="text-primary">{formatName(area.name)}</span>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <CardTitle className="text-2xl text-primary">{formatName(area.name)}</CardTitle>
              {isLoggedIn && <FavoriteButton cragId={area.uuid} isFavorited={isFavorited} />}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-secondary">
            <div className="flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full badge-primary text-xs font-medium">
                {area.totalClimbs} routes
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full badge-secondary text-xs font-medium">
                {formatCoords(area.latitude, area.longitude)}
              </span>
              {distance && (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full badge-success text-xs font-medium">
                  📍 {distance} away
                </span>
              )}
            </div>

            {area.children.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-primary">Sub-areas</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {area.children.map((child: (typeof area.children)[number]) => (
                    <Link
                      key={child.uuid}
                      to={`/crags/${child.uuid}`}
                      className="border border-gray-200 dark:border-gray-800 rounded-md px-3 py-2 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md transition-all cursor-pointer block"
                    >
                      <p className="font-medium text-gray-900 dark:text-gray-100">{formatName(child.name)}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Routes: {child.totalClimbs}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{formatCoords(child.latitude, child.longitude)}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-primary">Routes</h3>
              <RouteList climbs={area.climbs} cragId={area.uuid} />
            </div>

            {area.climbs.length !== 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-primary">7-day Weather</h3>
                {weather ? (
                  <WeatherWidget forecast={weather} />
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400">Weather unavailable for this crag.</p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400">Powered by OpenWeather; cached for 24h.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
