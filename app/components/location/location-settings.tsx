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
        <div className="rounded-lg bg-secondary p-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-secondary">Current Location:</span>
              <span className="font-medium">
                {currentCity || 'Not set'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Last Update:</span>
              <span className="font-medium text-xs">
                {formattedLastUpdate}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Status:</span>
              <span className={`font-medium text-sm ${isLocationEnabled ? 'text-success' : 'text-muted'}`}>
                {isLocationEnabled ? '✓ Enabled' : '✗ Disabled'}
              </span>
            </div>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="rounded-lg border border-default p-3" style={{backgroundColor: 'var(--accent-color)', opacity: 0.1}}>
          <p className="text-xs" style={{color: 'var(--accent-color)'}}>
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
          <div className="rounded-lg alert-destructive p-3">
            <p className="text-xs text-destructive">
              {fetcher.data.error}
            </p>
          </div>
        )}

        {/* Info */}
        <p className="text-xs text-muted italic">
          Note: Location updates work best on mobile devices with GPS enabled.
        </p>
      </CardContent>
    </Card>
  );
}
