import type { Route } from './+types/users.search';
import { Form } from 'react-router';
import { db } from '~/lib/db.server';
import { requireUser } from '~/lib/auth.server';
import type { UserProfile } from '~/types/db';
import { Card } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Button } from '~/components/ui/button';

export async function loader({ request }: Route.LoaderArgs) {
  const currentUser = await requireUser(request);
  const url = new URL(request.url);
  
  const location = url.searchParams.get('location') || undefined;
  const climbingStyle = url.searchParams.get('climbingStyle') || undefined;
  const experienceLevel = url.searchParams.get('experienceLevel') || undefined;
  const query = url.searchParams.get('query') || undefined;

  // Build query filters
  const whereClause: any = {
    id: { not: currentUser.id }, // Don't show current user
    deletedAt: null,
  };

  // Text search by displayName
  if (query) {
    whereClause.displayName = {
      contains: query,
      mode: 'insensitive',
    };
  }

  // Filter by location (city)
  if (location) {
    whereClause.locationCity = {
      contains: location,
      mode: 'insensitive',
    };
  }

  // Filter by climbing style
  if (climbingStyle) {
    whereClause.climbingStyles = {
      has: climbingStyle,
    };
  }

  // Filter by experience level
  if (experienceLevel) {
    whereClause.experienceLevel = experienceLevel;
  }

  // Fetch users with follow status
  const users = await db.user.findMany({
    where: whereClause,
    select: {
      id: true,
      displayName: true,
      bio: true,
      profilePhotoUrl: true,
      locationCity: true,
      climbingStyles: true,
      experienceLevel: true,
      email: true,
      _count: {
        select: {
          following: true,
          followers: true,
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
      { lastActiveAt: 'desc' },
    ],
    take: 50, // Limit results
  });

  // Transform to UserProfile format
  const userProfiles: UserProfile[] = users.map((user) => ({
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
    users: userProfiles,
    currentUserId: currentUser.id,
    filters: {
      location,
      climbingStyle,
      experienceLevel,
      query,
    },
  };
}

export default function UsersSearchRoute({ loaderData }: Route.ComponentProps) {
  const { users, filters } = loaderData;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Find Climbers</h1>
        </div>

        {/* Search and Filters */}
        <Card className="p-6 bg-white dark:bg-gray-800">
          <Form method="get" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name Search */}
              <div>
                <Label htmlFor="query">Search by name</Label>
                <Input
                  id="query"
                  name="query"
                  type="text"
                  placeholder="Search by username..."
                  defaultValue={filters.query}
                />
              </div>

              {/* Location Filter */}
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  name="location"
                  type="text"
                  placeholder="City or region..."
                  defaultValue={filters.location}
                />
              </div>

              {/* Climbing Style Filter */}
              <div>
                <Label htmlFor="climbingStyle">Climbing Style</Label>
                <select
                  id="climbingStyle"
                  name="climbingStyle"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  defaultValue={filters.climbingStyle}
                >
                  <option value="">All styles</option>
                  <option value="bouldering">Bouldering</option>
                  <option value="sport">Sport Climbing</option>
                  <option value="trad">Trad Climbing</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>

              {/* Experience Level Filter */}
              <div>
                <Label htmlFor="experienceLevel">Experience Level</Label>
                <select
                  id="experienceLevel"
                  name="experienceLevel"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  defaultValue={filters.experienceLevel}
                >
                  <option value="">All levels</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit">Search</Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  window.location.href = '/users/search';
                }}
              >
                Clear Filters
              </Button>
            </div>
          </Form>
        </Card>

        {/* Results */}
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {users.length} {users.length === 1 ? 'climber' : 'climbers'} found
          </p>

          {users.length === 0 ? (
            <Card className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800">
              No climbers found matching your search criteria. Try adjusting your filters.
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {users.map((user: UserProfile) => (
                <UserResultCard key={user.id} user={user} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface UserResultCardProps {
  user: UserProfile;
}

function UserResultCard({ user }: UserResultCardProps) {
  return (
    <Card className="p-4 hover:shadow-md transition-shadow bg-white dark:bg-gray-800">
      <a href={`/users/${user.displayName}`} className="block">
        <div className="flex items-start gap-4">
          {/* Profile Photo */}
          <div className="shrink-0">
            {user.profilePhotoUrl ? (
              <img
                src={user.profilePhotoUrl}
                alt={user.displayName}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 text-xl font-semibold">
                {user.displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {user.displayName}
              </h3>
              {user.isFollowing && (
                <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                  Following
                </span>
              )}
            </div>

            {user.locationCity && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">📍 {user.locationCity}</p>
            )}

            {user.bio && (
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 line-clamp-2">{user.bio}</p>
            )}

            <div className="flex items-center gap-4 mt-3 text-sm text-gray-600 dark:text-gray-400">
              <span>{user.followerCount || 0} followers</span>
              <span>•</span>
              <span className="capitalize">{user.experienceLevel}</span>
            </div>

            {user.climbingStyles.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {user.climbingStyles.map((style) => (
                  <span
                    key={style}
                    className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded capitalize"
                  >
                    {style}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </a>
    </Card>
  );
}
