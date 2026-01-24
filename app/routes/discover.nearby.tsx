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
    <div className="min-h-screen py-8" style={{background: 'linear-gradient(to bottom, var(--surface), var(--background))'}}>
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Nearby Climbers
          </h1>
          <p className="text-secondary">
            Connect with climbers near you
          </p>
        </div>

        {!hasLocationPermission ? (
          // Location not enabled message
          <div className="rounded-lg p-6 text-center" style={{backgroundColor: 'color-mix(in srgb, var(--primary-color) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--primary-color) 30%, transparent)'}}>
            <p className="text-sm mb-4" style={{color: 'var(--primary-color)'}}>
              Enable location sharing in your profile settings to discover nearby climbers.
            </p>
            <a
              href="/users/edit"
              className="btn-primary inline-block px-6 py-2 rounded-md text-sm font-medium"
            >
              Enable Location
            </a>
          </div>
        ) : totalFound === 0 ? (
          // No nearby users found
          <div className="rounded-lg bg-surface p-6 text-center">
            <p className="text-muted">
              No climbers found nearby. Check back soon or expand your search radius!
            </p>
          </div>
        ) : (
          // Display nearby users
          <div>
            <div className="mb-6 text-sm text-secondary">
              Found <span className="font-semibold text-primary">{totalFound}</span> climbers near you
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
