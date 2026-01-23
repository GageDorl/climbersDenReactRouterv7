import { useState, useEffect } from 'react';

export interface GeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface GeolocationError {
  code: number;
  message: string;
}

export interface UseGeolocationReturn {
  position: GeolocationPosition | null;
  error: GeolocationError | null;
  loading: boolean;
  requestLocation: () => void;
}

/**
 * React hook for accessing device geolocation
 * Requests high accuracy GPS with 10 second timeout
 */
export function useGeolocation(): UseGeolocationReturn {
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<GeolocationError | null>(null);
  const [loading, setLoading] = useState(false);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setError({
        code: 0,
        message: 'Geolocation is not supported by your browser',
      });
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setLoading(false);
      },
      (err) => {
        setError({
          code: err.code,
          message: getErrorMessage(err.code),
        });
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000, // 10 second timeout
        maximumAge: 0, // Don't use cached position
      }
    );
  };

  return { position, error, loading, requestLocation };
}

/**
 * Convert geolocation error code to user-friendly message
 */
function getErrorMessage(code: number): string {
  switch (code) {
    case 1:
      return 'Location permission denied. Please enable location access in your browser settings.';
    case 2:
      return 'Unable to determine your location. Please check your GPS signal.';
    case 3:
      return 'Location request timed out. Please try again.';
    default:
      return 'An unknown error occurred while getting your location.';
  }
}
