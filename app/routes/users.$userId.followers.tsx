import type { Route } from './+types/users.$userId.followers';
import { Link } from 'react-router';
import { db } from '~/lib/db.server';
import { requireUser } from '~/lib/auth.server';
import { Card } from '~/components/ui/card';
import { PageWrapper } from '~/components/ui/page-wrapper';
import { FollowButton } from '~/components/profile/follow-button';
import type { UserProfile } from '~/types/db';

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

  // Get followers with follow status from current user perspective
  const follows = await db.follow.findMany({
    where: {
      followedId: userId,
    },
    select: {
      follower: {
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

  const followers: UserProfile[] = follows.map((follow) => ({
    id: follow.follower.id,
    email: follow.follower.email,
    displayName: follow.follower.displayName,
    bio: follow.follower.bio,
    profilePhotoUrl: follow.follower.profilePhotoUrl,
    locationCity: follow.follower.locationCity,
    climbingStyles: follow.follower.climbingStyles,
    experienceLevel: follow.follower.experienceLevel,
    followerCount: follow.follower._count.followers,
    followingCount: follow.follower._count.following,
    isFollowing: follow.follower.followers.length > 0,
  }));

  return {
    user: {
      id: user.id,
      displayName: user.displayName,
    },
    followers,
    currentUserId: currentUser.id,
  };
}

export default function FollowersRoute({ loaderData }: Route.ComponentProps) {
  const { user, followers, currentUserId } = loaderData;

  return (
    <PageWrapper maxWidth="xl">
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link to={`/users/${user.displayName}`} className="link-primary">
            ← {user.displayName}
          </Link>
          <span className="text-secondary">/ Followers</span>
        </div>

        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-primary">
            Followers ({followers.length})
          </h1>

          {followers.length === 0 ? (
            <Card className="p-8 text-center text-muted">
              No followers yet
            </Card>
          ) : (
            <div className="space-y-3">
              {followers.map((follower: UserProfile) => (
                <Card key={follower.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <Link
                      to={`/users/${follower.displayName}`}
                      className="flex items-center gap-4 flex-1 min-w-0"
                    >
                      {/* Profile Photo */}
                      {follower.profilePhotoUrl ? (
                        <img
                          src={follower.profilePhotoUrl}
                          alt={follower.displayName}
                          className="w-14 h-14 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center text-secondary text-lg font-semibold shrink-0">
                          {follower.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-primary truncate">
                          {follower.displayName}
                        </h3>
                        {follower.locationCity && (
                          <p className="text-sm text-secondary">📍 {follower.locationCity}</p>
                        )}
                        {follower.bio && (
                          <p className="text-sm text-secondary mt-1 line-clamp-1">
                            {follower.bio}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-sm text-muted">
                          <span>{follower.followerCount || 0} followers</span>
                        </div>
                      </div>
                    </Link>

                    {/* Follow Button */}
                    {follower.id !== currentUserId && (
                      <div className="ml-4">
                        <FollowButton
                          userId={follower.id}
                          initialIsFollowing={follower.isFollowing || false}
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
      </div>
    </PageWrapper>
  );
}
