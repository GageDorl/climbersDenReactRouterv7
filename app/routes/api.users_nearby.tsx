import { getUserId } from '~/lib/auth.server';
import { db } from '~/lib/db.server';
import { findNearbyUsers } from '~/lib/geo-utils';

export async function loader({ request }: { request: Request }) {
  const userId = await getUserId(request);
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse query parameters
  const url = new URL(request.url);
  const lat = url.searchParams.get('lat');
  const lon = url.searchParams.get('lon');
  const radiusParam = url.searchParams.get('radius');
  const limitParam = url.searchParams.get('limit');

  // Validate required params
  if (!lat || !lon) {
    return Response.json(
      { error: 'Missing required parameters: lat and lon' },
      { status: 400 }
    );
  }

  try {
    // Parse numbers
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    const radius = radiusParam ? parseFloat(radiusParam) : 50;
    const limit = limitParam ? parseInt(limitParam) : 20;

    // Validate ranges
    if (latitude < -90 || latitude > 90) {
      throw new Error('Latitude must be between -90 and 90');
    }
    if (longitude < -180 || longitude > 180) {
      throw new Error('Longitude must be between -180 and 180');
    }
    if (radius < 1 || radius > 500) {
      throw new Error('Radius must be between 1 and 500 miles');
    }
    if (limit < 1 || limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }

    // Get nearby users using geo-utils function
    const nearbyUsers = await findNearbyUsers(db, latitude, longitude, radius, userId, limit);

    return Response.json({
      success: true,
      nearbyUsers,
    });
  } catch (error) {
    console.error('Error fetching nearby users:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch nearby users';
    return Response.json(
      { error: message },
      { status: 500 }
    );
  }
}
