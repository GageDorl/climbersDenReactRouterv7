import mapboxgl from 'mapbox-gl';

// Set Mapbox access token from environment
export function initializeMapbox(): void {
  const token = typeof window !== 'undefined' ? (window as any).__MAPBOX_TOKEN : null;
  
  if (!token) {
    console.warn('[Mapbox] No access token provided. Map features will not work.');
    return;
  }
  
  mapboxgl.accessToken = token;
}

/**
 * Get Mapbox style URL based on theme
 */
export function getMapboxStyle(theme: 'light' | 'dark' = 'light'): string {
  return theme === 'dark'
    ? 'mapbox://styles/mapbox/dark-v11'
    : 'mapbox://styles/mapbox/light-v11';
}

/**
 * Calculate map bounds from array of coordinates to fit all markers
 * @param coordinates Array of [longitude, latitude] pairs
 * @returns Bounds object for fitBounds
 */
export function buildBoundsFromCoords(
  coordinates: Array<[number, number]>
): mapboxgl.LngLatBounds | null {
  if (coordinates.length === 0) return null;

  let minLng = coordinates[0][0];
  let minLat = coordinates[0][1];
  let maxLng = coordinates[0][0];
  let maxLat = coordinates[0][1];

  for (const [lng, lat] of coordinates) {
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  }

  return new mapboxgl.LngLatBounds(
    [minLng, minLat],
    [maxLng, maxLat]
  );
}

/**
 * Create marker HTML for a crag with difficulty color coding
 */
export function createCragMarkerElement(difficulty: string): HTMLDivElement {
  const el = document.createElement('div');
  
  // Determine color based on difficulty
  let color = '#10b981'; // green - easy
  if (difficulty.includes('5.8') || difficulty.includes('5.9') || difficulty.includes('V1') || difficulty.includes('V2')) {
    color = '#f59e0b'; // yellow - moderate
  } else if (difficulty.includes('5.1') || difficulty.includes('5.11') || difficulty.includes('V3') || difficulty.includes('V4')) {
    color = '#ef4444'; // red - hard
  }
  
  el.style.backgroundColor = color;
  el.style.width = '32px';
  el.style.height = '32px';
  el.style.borderRadius = '50%';
  el.style.cursor = 'pointer';
  el.style.border = '2px solid white';
  el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  el.style.fontWeight = 'bold';
  el.style.fontSize = '12px';
  el.style.color = 'white';
  
  return el;
}

/**
 * Create user location marker element (blue dot)
 */
export function createUserLocationMarker(): HTMLDivElement {
  const el = document.createElement('div');
  
  el.style.backgroundColor = '#3b82f6'; // blue
  el.style.width = '24px';
  el.style.height = '24px';
  el.style.borderRadius = '50%';
  el.style.border = '3px solid white';
  el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
  
  return el;
}

/**
 * Format difficulty for display
 */
export function formatDifficulty(difficulties: string[]): string {
  if (!difficulties || difficulties.length === 0) return 'Unknown';
  // Get the most common difficulty range
  return difficulties.slice(0, 2).join(', ');
}
