import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { 
  initializeMapbox, 
  getMapboxStyle, 
  buildBoundsFromCoords,
  createCragMarkerElement,
  createUserLocationMarker,
  formatDifficulty,
} from '~/lib/mapbox';

export interface CragData {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  numRoutes?: number;
  grades?: string[];
  climbingTypes?: string[];
}

interface CragMapProps {
  crags: CragData[];
  userLocation?: { lat: number; lon: number };
  onCragSelect?: (cragId: string) => void;
  onMapMove?: (mapState: { center: { lat: number; lng: number }; zoom: number }) => void;
  className?: string;
  theme?: 'light' | 'dark';
}

/**
 * Interactive Mapbox GL map component showing crags as markers
 * Includes user location, clustering support, and click callbacks
 */
export function CragMap({
  crags,
  userLocation,
  onCragSelect,
  onMapMove,
  className = 'h-full',
  theme = 'light',
}: CragMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const hasInitializedBoundsRef = useRef(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize Mapbox token
    initializeMapbox();

    // Create map instance
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: getMapboxStyle(theme),
      zoom: 10,
      center: userLocation 
        ? [userLocation.lon, userLocation.lat]
        : [-95.7129, 37.2693], // Default to center US
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Listen for map movement to fetch new crags
    const handleMapMove = () => {
      if (map.current && onMapMove) {
        const center = map.current.getCenter();
        const zoom = map.current.getZoom();
        onMapMove({
          center: { lat: center.lat, lng: center.lng },
          zoom,
        });
      }
    };

    map.current.on('moveend', handleMapMove);
    map.current.on('zoomend', handleMapMove);

    // Add user location marker
    if (userLocation) {
      const userEl = createUserLocationMarker();
      userMarkerRef.current = new mapboxgl.Marker(userEl)
        .setLngLat([userLocation.lon, userLocation.lat])
        .addTo(map.current);
    }

    return () => {
      if (map.current) {
        map.current.off('moveend', handleMapMove);
        map.current.off('zoomend', handleMapMove);
        map.current.remove();
      }
    };
  }, [theme, userLocation, onMapMove]);

  // Update crag markers when crags change
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker: mapboxgl.Marker) => {
      marker.remove();
    });
    markersRef.current = [];

    // Add crag markers
    crags.forEach((crag) => {
      const el = createCragMarkerElement(formatDifficulty(crag.grades || []));
      
      const marker = new mapboxgl.Marker(el)
        .setLngLat([crag.longitude, crag.latitude])
        .addTo(map.current!);

      // Add click handler for popup
      marker.getElement().addEventListener('click', () => {
        // Close existing popup
        popupRef.current?.remove();

        // Create new popup
        const popup = new mapboxgl.Popup({ offset: 25 })
          .setHTML(`
            <div class="p-2">
              <h3 class="font-semibold text-primary mb-1">${crag.name}</h3>
              ${crag.numRoutes ? `<p class="text-sm text-secondary mb-2">${crag.numRoutes} routes</p>` : ''}
              ${crag.grades ? `<p class="text-sm text-secondary mb-3">${formatDifficulty(crag.grades)}</p>` : ''}
              <a href="/crags/${crag.id}" class="text-sm link-primary hover:underline font-medium">
                View Details →
              </a>
            </div>
          `)
          .addTo(map.current!);

        marker.setPopup(popup);
        popupRef.current = popup;

        // Callback
        onCragSelect?.(crag.id);
      });

      markersRef.current.push(marker);
    });

    // Only fit bounds on initial load - don't recenter on subsequent updates
    if (!hasInitializedBoundsRef.current && crags.length > 0) {
      hasInitializedBoundsRef.current = true;
      
      const coordinates = crags.map(c => [c.longitude, c.latitude] as [number, number]);
      
      // Include user location in bounds if present
      if (userLocation) {
        coordinates.push([userLocation.lon, userLocation.lat]);
      }
      
      const bounds = buildBoundsFromCoords(coordinates);
      if (bounds && map.current) {
        map.current.fitBounds(bounds, { padding: 80 });
      }
    }
  }, [crags, onCragSelect, userLocation]);

  return (
    <div
      ref={mapContainer}
      className={className}
      style={{ minHeight: '500px' }}
    />
  );
}
