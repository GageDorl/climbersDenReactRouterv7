import type { Route } from "./+types/discover.nearby";
import { redirect } from "react-router";
import { getUserId } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { findNearbyUsers } from "~/lib/geo-utils";
import { NearbyUsersCard } from "~/components/discovery/nearby-users-card";

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await getUserId(request);
  if (!userId) {
    return redirect("/auth/login");
  }

  // Get current user's location
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      latitude: true,
      longitude: true,
      locationPermissionGranted: true,
    },
  });

  if (!user) {
    return redirect("/auth/login");
  }

  // If user hasn't granted location permission or doesn't have coordinates
  if (!user.locationPermissionGranted || !user.latitude || !user.longitude) {
    return {
      nearbyUsers: [],
      userLocation: null,
      hasLocationPermission: false,
      totalFound: 0,
    };
  }

  // Find nearby users within 50 miles
  const nearbyUsers = await findNearbyUsers(
    db,
    user.latitude.toNumber(),
    user.longitude.toNumber(),
    50, // radiusMiles
    userId, // exclude current user
    50 // limit
  );

  return {
    nearbyUsers,
    userLocation: {
      latitude: user.latitude.toNumber(),
      longitude: user.longitude.toNumber(),
    },
    hasLocationPermission: user.locationPermissionGranted,
    totalFound: nearbyUsers.length,
  };
}

export default function DiscoverNearby({ loaderData }: Route.ComponentProps) {
  const { nearbyUsers, hasLocationPermission, totalFound } = loaderData;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Nearby Climbers
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Connect with climbers near you
          </p>
        </div>

        {!hasLocationPermission ? (
          // Location not enabled message
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-6 text-center">
            <p className="text-sm text-blue-900 dark:text-blue-200 mb-4">
              Enable location sharing in your profile settings to discover nearby climbers.
            </p>
            <a
              href="/users/edit"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Enable Location
            </a>
          </div>
        ) : totalFound === 0 ? (
          // No nearby users found
          <div className="rounded-lg bg-gray-100 dark:bg-gray-800 p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              No climbers found nearby. Check back soon or expand your search radius!
            </p>
          </div>
        ) : (
          // Display nearby users
          <div>
            <div className="mb-6 text-sm text-gray-600 dark:text-gray-400">
              Found <span className="font-semibold text-gray-900 dark:text-white">{totalFound}</span> climbers near you
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {nearbyUsers.map((user: any) => (
                <NearbyUsersCard
                  key={user.id}
                  user={user}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
