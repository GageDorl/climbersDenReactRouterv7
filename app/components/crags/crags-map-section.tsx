'use client';

import { AlertCircle, MapPin } from 'lucide-react';
import { Card } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Link } from 'react-router';

interface CragsMapSectionProps {
  userLocationPermissionGranted: boolean;
  userLatitude: number | null;
  userLongitude: number | null;
  currentUsername?: string | null;
}

/**
 * Component that displays nearby crags with a link if location is enabled
 * Shows a message to enable location if not
 */
export function CragsMapSection({
  userLocationPermissionGranted,
  userLatitude,
  userLongitude,
  currentUsername,
}: CragsMapSectionProps) {
  // If location is not enabled, show message
  if (!userLocationPermissionGranted) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-primary">
          Nearby Climbing Areas
        </h2>
        <Card className="p-6 bg-secondary border-default">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5 text-primary" />
            <div className="flex-1">
              <h3 className="font-semibold text-primary mb-1">Enable Location to See Crags Near You</h3>
              <p className="text-sm text-muted mb-4">
                Share your location to view climbing areas on a map and discover new crags in your area.
              </p>
              <Link to={currentUsername ? `/users/${currentUsername}/edit` : '/users/search'}>
                <Button size="sm" variant="outline">
                  <MapPin className="h-4 w-4 mr-2" />
                  Enable Location
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Show nearby crags with a link to browse them
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-primary">
        Nearby Climbing Areas
      </h2>
      <Card className="p-6 bg-surface border-default">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-primary mb-1">
              Browse Climbing Areas Near You
            </h3>
            <p className="text-sm text-muted">Discover crags and climbing routes in your area</p>
          </div>
          <Link to="/crags">
            <Button>
              <MapPin className="h-4 w-4 mr-2" />
              View on Map
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
