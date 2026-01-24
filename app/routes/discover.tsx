import type { Route } from './+types/discover';
import { Link } from 'react-router';
import { db } from '~/lib/db.server';
import { requireUser } from '~/lib/auth.server';
import { Card } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { FollowButton } from '~/components/profile/follow-button';
import { PageWrapper } from '~/components/ui/page-wrapper';
import { NearbyUsersSection } from '~/components/discovery/nearby-users-section';
import { CragsMapSection } from '~/components/crags/crags-map-section';
import type { UserProfile } from '~/types/db';

export async function loader({ request }: Route.LoaderArgs) {
  const currentUser = await requireUser(request);

  // Get users the current user is already following
  const existingFollows = await db.follow.findMany({
    where: { followerId: currentUser.id },
    select: { followedId: true },
  });
  const followedUserIds = existingFollows.map((f) => f.followedId);

  // Get current user's location settings
  const userLocation = await db.user.findUnique({
    where: { id: currentUser.id },
    select: {
      locationPermissionGranted: true,
      latitude: true,
      longitude: true,
    },
  });

  // Algorithm: Suggest users based on:
  // 1. Shared climbing styles
  // 2. Similar location
  // 3. Not already following
  // 4. Active users (recent activity)

  const suggestions = await db.user.findMany({
    where: {
      AND: [
        { id: { not: currentUser.id } }, // Not self
        { id: { notIn: followedUserIds } }, // Not already following
        { deletedAt: null }, // Not deleted
        {
          OR: [
            // Share at least one climbing style
            {
              climbingStyles: {
                hasSome: currentUser.climbingStyles,
              },
            },
            // Same location (if user has location set)
            currentUser.locationCity
              ? {
                  locationCity: {
                    equals: currentUser.locationCity,
                    mode: 'insensitive',
                  },
                }
              : {},
          ],
        },
      ],
    },
    select: {
      id: true,
      displayName: true,
      bio: true,
      profilePhotoUrl: true,
      locationCity: true,
      climbingStyles: true,
      experienceLevel: true,
      email: true,
      lastActiveAt: true,
      _count: {
        select: {
          followers: true,
          following: true,
          posts: true,
        },
      },
      followers: {
        where: {
          followerId: currentUser.id,
        },
        select: {
          id: true,
        },
      },
    },
    orderBy: [
      { lastActiveAt: 'desc' }, // Most recently active first
    ],
    take: 20,
  });

  // Also get users with mutual connections (followed by people you follow)
  const mutualConnections = await db.follow.findMany({
    where: {
      followerId: { in: followedUserIds },
      followedId: { notIn: [...followedUserIds, currentUser.id] },
    },
    select: {
      followed: {
        select: {
          id: true,
          displayName: true,
          bio: true,
          profilePhotoUrl: true,
          locationCity: true,
          climbingStyles: true,
          experienceLevel: true,
          email: true,
          deletedAt: true,
          _count: {
            select: {
              followers: true,
              following: true,
            },
          },
          followers: {
            where: {
              followerId: currentUser.id,
            },
            select: {
              id: true,
            },
          },
        },
      },
    },
    take: 10,
  });

  // Combine and deduplicate suggestions
  const allSuggestions = [
    ...suggestions,
    ...mutualConnections
      .filter((mc) => !mc.followed.deletedAt)
      .map((mc) => mc.followed),
  ];

  const uniqueSuggestions = Array.from(
    new Map(allSuggestions.map((user) => [user.id, user])).values()
  ).slice(0, 20);

  const suggestedUsers: UserProfile[] = uniqueSuggestions.map((user) => ({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    bio: user.bio,
    profilePhotoUrl: user.profilePhotoUrl,
    locationCity: user.locationCity,
    climbingStyles: user.climbingStyles,
    experienceLevel: user.experienceLevel,
    followerCount: user._count.followers,
    followingCount: user._count.following,
    isFollowing: user.followers.length > 0,
  }));

  return {
    suggestedUsers,
    currentUserId: currentUser.id,
    currentUserDisplayName: currentUser.displayName,
    userLocationPermissionGranted: userLocation?.locationPermissionGranted || false,
    userLatitude: userLocation?.latitude?.toNumber() || null,
    userLongitude: userLocation?.longitude?.toNumber() || null,
  };
}

export default function DiscoverRoute({ loaderData }: Route.ComponentProps) {
  const {
    suggestedUsers,
    currentUserId,
    currentUserDisplayName,
    userLocationPermissionGranted,
    userLatitude,
    userLongitude,
  } = loaderData;

  return (
    <PageWrapper maxWidth="7xl">
      <div className="space-y-8 w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Discover Climbers</h1>
          <Link to="/users/search">
            <Button variant="outline">🔍 Advanced Search</Button>
          </Link>
        </div>

        {/* Nearby Users Section */}
        <NearbyUsersSection
          userLocationPermissionGranted={userLocationPermissionGranted}
          userLatitude={userLatitude}
          userLongitude={userLongitude}
          currentUserDisplayName={currentUserDisplayName}
        />

        {/* Crags Map Section */}
        <CragsMapSection
          userLocationPermissionGranted={userLocationPermissionGranted}
          userLatitude={userLatitude}
          userLongitude={userLongitude}
        />

        {/* Suggested Users Section */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Suggested for You
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Based on your climbing style and location
            </p>
          </div>

          {suggestedUsers.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                No suggestions available right now
              </p>
              <Link to="/users/search">
                <Button>Browse All Climbers</Button>
              </Link>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {suggestedUsers.map((user: UserProfile) => (
                <Card key={user.id} className="p-4 hover:shadow-lg transition-shadow">
                  <div className="flex flex-col items-center text-center space-y-3">
                    {/* Profile Photo */}
                    <Link to={`/users/${user.displayName}`}>
                      {user.profilePhotoUrl ? (
                        <img
                          src={user.profilePhotoUrl}
                          alt={user.displayName}
                          className="w-20 h-20 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 text-2xl font-semibold">
                          {user.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </Link>

                    {/* User Info */}
                    <div className="w-full">
                      <Link to={`/users/${user.displayName}`}>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate">
                          {user.displayName}
                        </h3>
                      </Link>
                      {user.locationCity && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          📍 {user.locationCity}
                        </p>
                      )}
                    </div>

                    {/* Bio */}
                    {user.bio && (
                      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 w-full">
                        {user.bio}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                      <span>{user.followerCount || 0} followers</span>
                      <span>•</span>
                      <span className="capitalize">{user.experienceLevel}</span>
                    </div>

                    {/* Climbing Styles */}
                    {user.climbingStyles.length > 0 && (
                      <div className="flex flex-wrap gap-1 justify-center w-full">
                        {user.climbingStyles.slice(0, 3).map((style: string) => (
                          <span
                            key={style}
                            className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded capitalize"
                          >
                            {style}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Follow Button */}
                    <div className="w-full pt-2">
                      <FollowButton
                        userId={user.id}
                        initialIsFollowing={user.isFollowing || false}
                        size="default"
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <Card className="p-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Looking for someone specific?
          </h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/users/search" className="flex-1">
              <Button variant="secondary" className="w-full">
                🔍 Search by Name or Location
              </Button>
            </Link>
            <Link to="/users/search?climbingStyle=bouldering" className="flex-1">
              <Button variant="secondary" className="w-full">
                🧗 Find Boulderers
              </Button>
            </Link>
            <Link to="/users/search?climbingStyle=sport" className="flex-1">
              <Button variant="secondary" className="w-full">
                🪢 Find Sport Climbers
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </PageWrapper>
  );
}
