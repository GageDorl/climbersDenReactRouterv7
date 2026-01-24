'use client';

import { useEffect, useState } from 'react';
import { Card } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Link } from 'react-router';
import { MapPin, AlertCircle, Loader } from 'lucide-react';
import { NearbyUsersCard } from './nearby-users-card';

interface NearbyUser {
  id: string;
  displayName: string;
  profilePhotoUrl: string | null;
  climbingStyles: string[];
  experienceLevel: string;
  distance: number;
  locationCity: string | null;
}

interface NearbyUsersSectionProps {
  userLocationPermissionGranted: boolean;
  userLatitude: number | null;
  userLongitude: number | null;
}

/**
 * Component that displays nearby climbers if location is enabled
 * Shows a message to enable location if not
 */
export function NearbyUsersSection({
  userLocationPermissionGranted,
  userLatitude,
  userLongitude,
}: NearbyUsersSectionProps) {
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch nearby users when location is available
  useEffect(() => {
    if (!userLocationPermissionGranted || !userLatitude || !userLongitude) {
      return;
    }

    const fetchNearbyUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/users/nearby?lat=${userLatitude}&lon=${userLongitude}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch nearby users');
        }

        const data = await response.json();
        setNearbyUsers(data.nearbyUsers || []);
      } catch (err) {
        console.error('Error fetching nearby users:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load nearby users'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchNearbyUsers();
  }, [userLocationPermissionGranted, userLatitude, userLongitude]);

  // If location is not enabled, show message
  if (!userLocationPermissionGranted) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Discover Nearby Climbers
        </h2>
        <Card className="p-6 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-1">
                Enable Location to See Nearby Climbers
              </h3>
              <p className="text-sm text-amber-800 dark:text-amber-300 mb-4">
                Share your location to discover climbers near you and find climbing partners.
                Your exact coordinates are never shared—only your city is visible to other users.
              </p>
              <Link to="/users/me/edit">
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

  // If loading, show spinner
  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Discover Nearby Climbers
        </h2>
        <div className="flex justify-center py-8">
          <Loader className="h-6 w-6 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  // If error, show error message
  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Discover Nearby Climbers
        </h2>
        <Card className="p-6 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-200">
                Error Loading Nearby Climbers
              </h3>
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // If no nearby users, show empty state
  if (nearbyUsers.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Discover Nearby Climbers
        </h2>
        <Card className="p-8 text-center">
          <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No climbers found nearby. Check back later or expand your search.
          </p>
          <Link to="/users/search">
            <Button variant="outline">Search All Climbers</Button>
          </Link>
        </Card>
      </div>
    );
  }

  // Show nearby users grid
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Discover Nearby Climbers
        </h2>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {nearbyUsers.length} climber{nearbyUsers.length !== 1 ? 's' : ''} nearby
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {nearbyUsers.map((user) => (
          <NearbyUsersCard key={user.id} user={user} />
        ))}
      </div>
    </div>
  );
}
