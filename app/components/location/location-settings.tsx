import { useFetcher } from 'react-router';
import { useGeolocation } from '~/hooks/use-geolocation';
import { useState, useEffect, useRef } from 'react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { MapPin, RefreshCw } from 'lucide-react';

interface LocationSettingsProps {
  currentCity?: string | null;
  lastLocationUpdate?: string | null;
  locationPermissionGranted?: boolean;
  onLocationUpdate?: (latitude: number, longitude: number) => void;
}

/**
 * Component for managing location settings in user profile
 * Allows users to enable/disable location sharing and manually refresh location
 */
export function LocationSettings({
  currentCity,
  lastLocationUpdate,
  locationPermissionGranted = false,
  onLocationUpdate,
}: LocationSettingsProps) {
  const { position, requestLocation, loading } = useGeolocation();
  const fetcher = useFetcher();
  const [isLocationEnabled, setIsLocationEnabled] = useState(locationPermissionGranted);
  const lastSubmittedPosRef = useRef<{ lat: number; lon: number } | null>(null);

  // Submit location to server when position updates (only once per unique position)
  useEffect(() => {
    if (!position) return;

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

    onLocationUpdate?.(position.latitude, position.longitude);
  }, [position]);

  const handleToggleLocation = async () => {
    if (isLocationEnabled) {
      // Disable location - just update server
      fetcher.submit(
        {
          latitude: '0',
          longitude: '0',
          granted: 'false',
        },
        {
          method: 'POST',
          action: '/api/user/location',
        }
      );
      setIsLocationEnabled(false);
    } else {
      // Enable location - request from device
      requestLocation();
      setIsLocationEnabled(true);
    }
  };

  const handleRefreshLocation = () => {
    requestLocation();
  };

  const formattedLastUpdate = lastLocationUpdate
    ? new Date(lastLocationUpdate).toLocaleString()
    : 'Never';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Location Settings
        </CardTitle>
        <CardDescription>
          Share your location to discover nearby climbers and view crags on a map
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Location Display */}
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Current Location:</span>
              <span className="font-medium">
                {currentCity || 'Not set'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Last Update:</span>
              <span className="font-medium text-xs">
                {formattedLastUpdate}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Status:</span>
              <span className={`font-medium text-sm ${isLocationEnabled ? 'text-green-600' : 'text-gray-600'}`}>
                {isLocationEnabled ? '✓ Enabled' : '✗ Disabled'}
              </span>
            </div>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
          <p className="text-xs text-blue-900 dark:text-blue-200">
            <span className="font-semibold">Privacy:</span> Your exact coordinates are never shared. Other users only see your approximate city. You can disable this anytime.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {/* Toggle Location */}
          <Button
            onClick={handleToggleLocation}
            disabled={fetcher.state === 'submitting' || loading}
            variant={isLocationEnabled ? 'destructive' : 'default'}
            className="flex-1"
          >
            {fetcher.state === 'submitting' ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Updating...
              </span>
            ) : isLocationEnabled ? (
              'Disable Location'
            ) : (
              'Enable Location'
            )}
          </Button>

          {/* Refresh Location Button */}
          {isLocationEnabled && (
            <Button
              onClick={handleRefreshLocation}
              disabled={loading}
              variant="outline"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2">Refresh Now</span>
            </Button>
          )}
        </div>

        {/* Error Message */}
        {fetcher.data?.error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
            <p className="text-xs text-red-900 dark:text-red-200">
              {fetcher.data.error}
            </p>
          </div>
        )}

        {/* Info */}
        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
          Note: Location updates work best on mobile devices with GPS enabled.
        </p>
      </CardContent>
    </Card>
  );
}
