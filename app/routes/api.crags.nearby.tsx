import { getCragsWithinBbox } from '~/lib/openbeta.server';

/**
 * Calculate bounding box from map center and zoom level
 * Based on Web Mercator projection
 */
function calculateBbox(
  centerLat: number,
  centerLng: number,
  zoomLevel: number
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  // Rough calculation: at zoom level, approximate degrees per pixel
  // At zoom 0, the world is 256px wide
  // Each zoom level doubles the size
  const metersPerPixel = (40075017 * Math.cos((centerLat * Math.PI) / 180)) / Math.pow(2, zoomLevel + 8);

  // Typical viewport is about 800px × 600px, but we'll use a reasonable radius
  // to load crags: approximately 50km radius view
  const radiusKm = Math.max(15, Math.min(50, 50 / Math.pow(2, zoomLevel - 12)));
  const radiusMeters = radiusKm * 1000;

  // Convert meters to degrees (rough: 1 degree ≈ 111km at equator)
  const latOffset = (radiusMeters / 111320) * 1.2; // Add 20% buffer for diagonal
  const lngOffset = (radiusMeters / (111320 * Math.cos((centerLat * Math.PI) / 180))) * 1.2;

  return {
    minLat: Math.max(-85.05112, centerLat - latOffset),
    maxLat: Math.min(85.05112, centerLat + latOffset),
    minLng: Math.max(-180, centerLng - lngOffset),
    maxLng: Math.min(180, centerLng + lngOffset),
  };
}

export async function loader({ request }: { request: Request }) {
  // Parse query parameters
  const url = new URL(request.url);
  const lat = url.searchParams.get('lat');
  const lon = url.searchParams.get('lon');
  const zoom = url.searchParams.get('zoom');

  // Validate required params
  if (!lat || !lon) {
    return Response.json(
      { error: 'Missing required parameters: lat and lon' },
      { status: 400 }
    );
  }

  try {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    const zoomLevel = zoom ? parseFloat(zoom) : 10;

    // Validate ranges
    if (latitude < -90 || latitude > 90) {
      throw new Error('Latitude must be between -90 and 90');
    }
    if (longitude < -180 || longitude > 180) {
      throw new Error('Longitude must be between -180 and 180');
    }

    // Calculate bounding box from center and zoom level
    const bbox = calculateBbox(latitude, longitude, zoomLevel);

    // Query OpenBeta for crags within the bounding box
    const crags = await getCragsWithinBbox(
      bbox.maxLat,
      bbox.minLat,
      bbox.maxLng,
      bbox.minLng,
      100, // limit
      zoomLevel // zoom
    );

    return Response.json({
      success: true,
      crags,
    });
  } catch (error) {
    console.error('Error fetching nearby crags:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch crags';
    return Response.json(
      { error: message },
      { status: 500 }
    );
  }
}
