import type { Route } from "./+types/users.$userId";
import { redirect } from "react-router";
import { Link } from "react-router";
import { db } from "~/lib/db.server";
import { getUserId } from "~/lib/auth.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { FollowButton } from "~/components/profile/follow-button";
import { PageWrapper } from "~/components/ui/page-wrapper";

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

  return { 
    user: {
      ...user,
      followers: undefined, // Don't send followers array to client
    },
    isOwnProfile,
    isFollowing,
    followerCount: user._count.followers,
    followingCount: user._count.following,
  };
}

export default function UserProfile({ loaderData }: Route.ComponentProps) {
  const { user, isOwnProfile, isFollowing, followerCount, followingCount } = loaderData;

  return (
    <PageWrapper maxWidth="4xl">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                {user.profilePhotoUrl ? (
                  <img
                    src={user.profilePhotoUrl}
                    alt={user.displayName}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-blue-500 dark:bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                    {user.displayName[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <CardTitle className="text-2xl text-black dark:text-white">{user.displayName}</CardTitle>
                  {user.locationCity && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">📍 {user.locationCity}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {isOwnProfile ? (
                  <Link to={`/users/${user.displayName}/edit`}>
                    <Button variant="outline">Edit Profile</Button>
                  </Link>
                ) : (
                  <FollowButton 
                    userId={user.id} 
                    initialIsFollowing={isFollowing}
                  />
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {user.bio && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">About</h3>
                <p className="text-gray-600 dark:text-gray-300">{user.bio}</p>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link to={`/posts/user/${user.id}`} className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{user._count.posts}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">Posts</p>
              </Link>
              <Link to={`/users/${user.id}/followers`} className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{followerCount}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">Followers</p>
              </Link>
              <Link to={`/users/${user.id}/following`} className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{followingCount}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">Following</p>
              </Link>
              <Link to={`/ticks/user/${user.id}`} className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{user._count.ticks}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">Ticks</p>
              </Link>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Climbing Info</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-300">Styles:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {user.climbingStyles.map((style: string) => (
                      <span
                        key={style}
                        className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 text-sm rounded-full capitalize"
                      >
                        {style}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-300">Experience Level:</span>
                  <span className="ml-2 px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 text-sm rounded-full capitalize">
                    {user.experienceLevel}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400 pt-4 border-t dark:border-gray-700">
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
