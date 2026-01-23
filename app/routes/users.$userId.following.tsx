import type { Route } from './+types/users.$userId.following';
import { Link } from 'react-router';
import { db } from '~/lib/db.server';
import { requireUser } from '~/lib/auth.server';
import { Card } from '~/components/ui/card';
import { FollowButton } from '~/components/profile/follow-button';
import type { UserProfile } from '~/types/db';
import { PageWrapper } from '~/components/ui/page-wrapper';

export async function loader({ params, request }: Route.LoaderArgs) {
  const currentUser = await requireUser(request);
  const { userId } = params;

  if (!userId) {
    throw new Response('User ID is required', { status: 400 });
  }

  // Get the target user
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      displayName: true,
      deletedAt: true,
    },
  });

  if (!user || user.deletedAt) {
    throw new Response('User not found', { status: 404 });
  }

  // Get following with follow status from current user perspective
  const follows = await db.follow.findMany({
    where: {
      followerId: userId,
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
    orderBy: {
      createdAt: 'desc',
    },
    take: 100,
  });

  const following: UserProfile[] = follows.map((follow) => ({
    id: follow.followed.id,
    email: follow.followed.email,
    displayName: follow.followed.displayName,
    bio: follow.followed.bio,
    profilePhotoUrl: follow.followed.profilePhotoUrl,
    locationCity: follow.followed.locationCity,
    climbingStyles: follow.followed.climbingStyles,
    experienceLevel: follow.followed.experienceLevel,
    followerCount: follow.followed._count.followers,
    followingCount: follow.followed._count.following,
    isFollowing: follow.followed.followers.length > 0,
  }));

  return {
    user: {
      id: user.id,
      displayName: user.displayName,
    },
    following,
    currentUserId: currentUser.id,
  };
}

export default function FollowingRoute({ loaderData }: Route.ComponentProps) {
  const { user, following, currentUserId } = loaderData;

  return (
    <PageWrapper maxWidth="xl">
        <div className="flex items-center gap-2">
          <Link to={`/users/${user.displayName}`} className="text-blue-600 hover:underline dark:text-blue-400">
            ← {user.displayName}
          </Link>
          <span className="text-gray-600 dark:text-gray-400">/ Following</span>
        </div>

        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Following ({following.length})
          </h1>

          {following.length === 0 ? (
            <Card className="p-8 text-center text-gray-500 dark:text-gray-400">
              Not following anyone yet
            </Card>
          ) : (
            <div className="space-y-3">
              {following.map((followedUser: UserProfile) => (
                <Card key={followedUser.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <Link
                      to={`/users/${followedUser.displayName}`}
                      className="flex items-center gap-4 flex-1 min-w-0"
                    >
                      {/* Profile Photo */}
                      {followedUser.profilePhotoUrl ? (
                        <img
                          src={followedUser.profilePhotoUrl}
                          alt={followedUser.displayName}
                          className="w-14 h-14 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 text-lg font-semibold shrink-0">
                          {followedUser.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {followedUser.displayName}
                        </h3>
                        {followedUser.locationCity && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">📍 {followedUser.locationCity}</p>
                        )}
                        {followedUser.bio && (
                          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 line-clamp-1">
                            {followedUser.bio}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-sm text-gray-600 dark:text-gray-400">
                          <span>{followedUser.followerCount || 0} followers</span>
                        </div>
                      </div>
                    </Link>

                    {/* Follow Button */}
                    {followedUser.id !== currentUserId && (
                      <div className="ml-4">
                        <FollowButton
                          userId={followedUser.id}
                          initialIsFollowing={followedUser.isFollowing || false}
                          size="sm"
                        />
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
    </PageWrapper>
  );
}
