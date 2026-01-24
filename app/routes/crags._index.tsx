import type { Route } from './+types/crags._index';
import { Form, useNavigation, Link } from 'react-router';
import { PageWrapper } from '~/components/ui/page-wrapper';
import { CragCard } from '~/components/crags/crag-card';
import { searchAreasByName } from '~/lib/openbeta.server';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { getUser, getUserId } from '~/lib/auth.server';
import { db } from '~/lib/db.server';
import { CragMap } from '~/components/crags/crag-map';
import { useState, useRef, useCallback } from 'react';
import { MapPin, Loader } from 'lucide-react';

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const query = url.searchParams.get('q')?.trim() ?? '';
  const viewMode = url.searchParams.get('view') as 'list' | 'map' | undefined;

  const results = query ? await searchAreasByName(query, 50) : [];
  const user = await getUser(request);
  const userId = await getUserId(request);

  // Get user location if logged in and has permission
  let userLocation = null;
  if (userId) {
    const userWithLocation = await db.user.findUnique({
      where: { id: userId },
      select: {
        latitude: true,
        longitude: true,
        locationPermissionGranted: true,
      },
    });

    if (
      userWithLocation?.locationPermissionGranted &&
      userWithLocation?.latitude &&
      userWithLocation?.longitude
    ) {
      userLocation = {
        lat: userWithLocation.latitude.toNumber(),
        lon: userWithLocation.longitude.toNumber(),
      };
    }
  }

  return { 
    query, 
    results, 
    isLoggedIn: !!user,
    userLocation,
    defaultViewMode: viewMode || 'list',
  };
}

export default function CragBrowser({ loaderData }: Route.ComponentProps) {
  const { query, results, isLoggedIn, userLocation, defaultViewMode } = loaderData;
  const [viewMode, setViewMode] = useState<'list' | 'map'>(defaultViewMode);
  const [selectedCragId, setSelectedCragId] = useState<string | null>(null);
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [mapCrags, setMapCrags] = useState(results);
  const [loadingMapCrags, setLoadingMapCrags] = useState(false);
  const mapMoveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastMapStateRef = useRef<any>(null);
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting' || navigation.state === 'loading';

  // Handle map movement - fetch crags for the visible area with debouncing
  const handleMapMove = useCallback((mapState: any) => {
    // Clear any pending timeout
    if (mapMoveTimeoutRef.current) {
      clearTimeout(mapMoveTimeoutRef.current);
    }

    // Don't fetch if map state hasn't changed significantly
    if (lastMapStateRef.current) {
      const latChange = Math.abs(lastMapStateRef.current.center.lat - mapState.center.lat);
      const lngChange = Math.abs(lastMapStateRef.current.center.lng - mapState.center.lng);
      const zoomChange = Math.abs(lastMapStateRef.current.zoom - mapState.zoom);
      
      // Only fetch if movement is significant (more than 0.1 degrees or 0.5 zoom)
      if (latChange < 0.1 && lngChange < 0.1 && zoomChange < 0.5) {
        return;
      }
    }

    lastMapStateRef.current = mapState;

    // Debounce the fetch request by 500ms
    mapMoveTimeoutRef.current = setTimeout(async () => {
      setLoadingMapCrags(true);
      setMapCrags([]); // Clear old crags before fetching new ones
      try {
        // Fetch crags near the map center
        const response = await fetch(
          `/api/crags/nearby?lat=${mapState.center.lat}&lon=${mapState.center.lng}&zoom=${mapState.zoom}`
        );
        
        console.log('Fetching crags from:', `/api/crags/nearby?lat=${mapState.center.lat}&lon=${mapState.center.lng}&zoom=${mapState.zoom}`);
        console.log('Response status:', response.status, response.ok);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Crags data received:', data);
          if (data.crags) {
            console.log('Setting mapCrags with', data.crags.length, 'crags');
            setMapCrags(data.crags);
          }
        } else {
          console.error('API error response:', response.status, await response.text());
        }
      } catch (error) {
        console.error('Error fetching crags for map:', error);
      } finally {
        setLoadingMapCrags(false);
      }
    }, 500);
  }, []);

  return (
    <PageWrapper maxWidth="4xl">
      {isLoggedIn && (
        <div className="mb-4 flex justify-end">
          <Link
            to="/crags/favorites"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            View my favorites →
          </Link>
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Find a Crag</CardTitle>
        </CardHeader>
        <CardContent>
          <Form method="get" className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search by name (e.g., Smith Rock)"
              className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-70"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Searching…' : 'Search'}
            </button>
          </Form>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Data provided by the public OpenBeta GraphQL API (no API key required).
          </p>
        </CardContent>
      </Card>

      {/* View mode toggle - show if results OR user has location */}
      {(results.length > 0 || userLocation) && (
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            List View
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
              viewMode === 'map'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <MapPin className="h-4 w-4" />
            Map View
          </button>
        </div>
      )}

      {query && results.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-gray-600 dark:text-gray-400">
            No crags found matching "{query}".
          </CardContent>
        </Card>
      )}

      {/* Map View - show with search results OR user location */}
      {viewMode === 'map' && (results.length > 0 || userLocation) && (
        <>
          {results.length === 0 && (
            <Card className="mb-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <CardContent className="py-4 text-center text-sm text-blue-900 dark:text-blue-200">
                <MapPin className="h-5 w-5 inline mr-2" />
                Showing your location. Search for a crag name (e.g., "Smith Rock", "Red Rock") to see results on the map.
              </CardContent>
            </Card>
          )}
          <Card className="mb-6">
            <CardContent className="p-0 relative">
              {loadingMapCrags && (
                <div className="absolute top-2 right-2 z-10 bg-white dark:bg-gray-800 rounded-lg p-2 shadow-lg flex items-center gap-2">
                  <Loader className="h-4 w-4 animate-spin text-blue-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Loading crags...</span>
                </div>
              )}
              <CragMap
                crags={mapCrags.map((area: any) => ({
                  id: area.uuid || area.id,
                  name: area.name || area.area_name,
                  latitude: area.latitude || area.metadata?.lat,
                  longitude: area.longitude || area.metadata?.lng,
                  numRoutes: area.routeCount || area.totalClimbs || 0,
                  grades: area.routes?.map((r: any) => r.grade).filter((g: any) => g) || [],
                  climbingTypes: area.climbingTypes || [],
                }))}
                userLocation={userLocation || undefined}
                onCragSelect={setSelectedCragId}
                onMapMove={handleMapMove}
                className="h-96"
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* List View - only show when not in map view and have results */}
      {viewMode === 'list' && results.length > 0 && (
        <div className="space-y-3">
          {results.map((area: Awaited<ReturnType<typeof searchAreasByName>>[number]) => (
            <CragCard key={area.uuid} area={area} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {viewMode === 'list' && results.length === 0 && !query && (
        <Card>
          <CardContent className="py-10 text-center">
            <MapPin className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Search for a Crag
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Enter a crag name to find climbing areas
            </p>
            {userLocation && (
              <p className="text-sm text-blue-600 dark:text-blue-400">
                💡 Tip: Try switching to Map View to see nearby areas
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </PageWrapper>
  );
}
