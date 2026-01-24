import type { Route } from "./+types/users.$userId";
import { redirect } from "react-router";
import { Link } from "react-router";
import { db } from "~/lib/db.server";
import { getUserId } from "~/lib/auth.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { FollowButton } from "~/components/profile/follow-button";
import { PageWrapper } from "~/components/ui/page-wrapper";
import { ClickableProfilePicture } from "~/components/ui/clickable-profile-picture";

export async function loader({ request, params }: Route.LoaderArgs) {
  const currentUserId = await getUserId(request);
  if (!currentUserId) {
    return redirect(`/auth/login?redirectTo=/users/${params.username}`);
  }

  const username = params.username;
  if (!username) {
    throw new Response("Username is required", { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { displayName: username },
    select: {
      id: true,
      displayName: true,
      bio: true,
      profilePhotoUrl: true,
      climbingStyles: true,
      experienceLevel: true,
      locationCity: true,
      createdAt: true,
      _count: {
        select: {
          posts: true,
          followers: true,
          following: true,
          ticks: true,
        },
      },
      followers: {
        where: {
          followerId: currentUserId,
        },
        select: {
          id: true,
        },
      },
    },
  });

  if (!user) {
    throw new Response("User not found", { status: 404 });
  }

  const isOwnProfile = currentUserId === user.id;
  const isFollowing = user.followers.length > 0;
  // Does the profile user follow the current user? (so current user can "follow back")
  const profileFollowsYou = !!(await db.follow.findFirst({ where: { followerId: user.id, followedId: currentUserId } }));

  return { 
    user: {
      ...user,
      followers: undefined, // Don't send followers array to client
    },
    isOwnProfile,
    isFollowing,
    profileFollowsYou,
    followerCount: user._count.followers,
    followingCount: user._count.following,
  };
}

export default function UserProfile({ loaderData }: Route.ComponentProps) {
  const { user, isOwnProfile, isFollowing, profileFollowsYou, followerCount, followingCount } = loaderData;

  return (
    <PageWrapper maxWidth="4xl">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                {user.profilePhotoUrl ? (
                  <ClickableProfilePicture
                    src={user.profilePhotoUrl}
                    alt={user.displayName}
                    size="xl"
                    username={user.displayName}
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold" style={{backgroundColor: 'var(--primary-color)'}}>
                    {user.displayName[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <CardTitle className="text-2xl text-primary">{user.displayName}</CardTitle>
                  {user.locationCity && (
                    <p className="text-sm text-secondary mt-1">📍 {user.locationCity}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {isOwnProfile ? (
                  <Link to={`/users/${user.displayName}/edit`}>
                    <Button variant="outline">Edit Profile</Button>
                  </Link>
                ) : (
                  <div className="flex items-center gap-2">
                    <Link to={`/messages/new?to=${encodeURIComponent(user.displayName)}`}>
                      <Button variant="outline">Message</Button>
                    </Link>
                    <FollowButton 
                      userId={user.id} 
                      initialIsFollowing={isFollowing}
                      isFollower={profileFollowsYou}
                    />
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {user.bio && (
              <div>
                <h3 className="text-sm font-semibold text-primary mb-2">About</h3>
                <p className="text-secondary">{user.bio}</p>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link to={`/posts/user/${user.id}`} className="text-center p-4 bg-surface rounded-lg hover:bg-secondary transition-colors">
                <p className="text-2xl font-bold" style={{color: 'var(--primary-color)'}}>{user._count.posts}</p>
                <p className="text-sm text-secondary">Posts</p>
              </Link>
              <Link to={`/users/${user.id}/followers`} className="text-center p-4 bg-surface rounded-lg hover:bg-secondary transition-colors">
                <p className="text-2xl font-bold" style={{color: 'var(--primary-color)'}}>{followerCount}</p>
                <p className="text-sm text-secondary">Followers</p>
              </Link>
              <Link to={`/users/${user.id}/following`} className="text-center p-4 bg-surface rounded-lg hover:bg-secondary transition-colors">
                <p className="text-2xl font-bold" style={{color: 'var(--primary-color)'}}>{followingCount}</p>
                <p className="text-sm text-secondary">Following</p>
              </Link>
              <Link to={`/ticks/user/${user.id}`} className="text-center p-4 bg-surface rounded-lg hover:bg-secondary transition-colors">
                <p className="text-2xl font-bold" style={{color: 'var(--primary-color)'}}>{user._count.ticks}</p>
                <p className="text-sm text-secondary">Ticks</p>
              </Link>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-primary mb-2">Climbing Info</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-secondary">Styles:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {user.climbingStyles.map((style: string) => (
                      <span
                        key={style}
                        className="px-3 py-1 badge-accent text-sm rounded-full capitalize"
                      >
                        {style}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-secondary">Experience Level:</span>
                  <span className="ml-2 px-3 py-1 badge-success text-sm rounded-full capitalize">
                    {user.experienceLevel}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-xs text-muted pt-4 border-t border-default">
              Member since {(() => {
                const date = new Date(user.createdAt);
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const month = months[date.getMonth()];
                const day = date.getDate();
                const year = date.getFullYear();
                return `${month} ${day}, ${year}`;
              })()}
            </div>
          </CardContent>
        </Card>
    </PageWrapper>
  );
}
