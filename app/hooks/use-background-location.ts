import { useEffect, useRef, useState } from 'react';
import { useGeolocation } from './use-geolocation';
import { useFetcher } from 'react-router';

interface UseBackgroundLocationOptions {
  enabled?: boolean;
  intervalMs?: number; // Milliseconds between location updates (default 120000 = 2 minutes)
  showNotification?: boolean;
}

/**
 * Hook for periodically updating user's location in the background
 * Only runs if geolocation permission is granted
 * Updates every 2 minutes by default (configurable)
 */
export function useBackgroundLocation({
  enabled = true,
  intervalMs = 120000, // 2 minutes
  showNotification = false,
}: UseBackgroundLocationOptions = {}) {
  const { position, error: geoError, requestLocation } = useGeolocation();
  const fetcher = useFetcher();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const lastSubmittedPosRef = useRef<{ lat: number; lon: number } | null>(null);

  // Start periodic location updates
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Request initial location
    requestLocation();

    // Set up periodic updates
    intervalRef.current = setInterval(() => {
      requestLocation();
    }, intervalMs);

    setIsRunning(true);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsRunning(false);
    };
  }, [enabled, intervalMs, requestLocation]);

  // Submit location to server when position updates (only once per unique position)
  useEffect(() => {
    if (!position || !enabled) {
      return;
    }

    // Only submit if this is a new position
    if (
      lastSubmittedPosRef.current &&
      lastSubmittedPosRef.current.lat === position.latitude &&
      lastSubmittedPosRef.current.lon === position.longitude
    ) {
      return;
    }

    lastSubmittedPosRef.current = {
      lat: position.latitude,
      lon: position.longitude,
    };

    // Submit to /api/user/location
    fetcher.submit(
      {
        latitude: position.latitude.toString(),
        longitude: position.longitude.toString(),
        granted: 'true',
      },
      {
        method: 'POST',
        action: '/api/user/location',
      }
    );

    if (showNotification && fetcher.state === 'idle' && fetcher.data?.success) {
      console.debug('[Location] Background location updated successfully');
    }
  }, [position, enabled]);

  // Handle errors
  useEffect(() => {
    if (geoError) {
      console.warn('[Location] Geolocation error:', geoError.message);
      // Don't break the app - just log and continue
    }
  }, [geoError]);

  return {
    isRunning,
    position,
    error: geoError || (fetcher.data?.error ? { code: -1, message: fetcher.data.error } : null),
    isUpdating: fetcher.state === 'submitting',
  };
}
