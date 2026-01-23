import type { Route } from './+types/posts.following';
import { db } from '~/lib/db.server';
import { getUserId } from '~/lib/auth.server';
import { Card, CardContent } from '~/components/ui/card';

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await getUserId(request);
  if (!userId) {
    throw new Response('Unauthorized', { status: 401 });
  }

  const url = new URL(request.url);
  const cursor = url.searchParams.get('cursor');
  const limit = 20;

  // Get list of followed user IDs
  const following = await db.follow.findMany({
    where: { followerId: userId },
    select: { followedId: true },
  });

  const followedUserIds = following.map(f => f.followedId);

  if (followedUserIds.length === 0) {
    return { posts: [], nextCursor: null, hasMore: false };
  }

  // Get posts from followed users only
  const posts = await db.post.findMany({
    where: {
      userId: { in: followedUserIds },
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    },
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          profilePhotoUrl: true,
        },
      },
      likes: {
        where: { userId },
        select: { id: true },
      },
      comments: {
        where: { 
          deletedAt: null,
          parentCommentId: null, // Only top-level comments
        },
        take: 100, // Load all comments (preview will show only 3)
        orderBy: { createdAt: 'asc' }, // Oldest first
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              profilePhotoUrl: true,
            },
          },
          replies: {
            where: { deletedAt: null },
            take: 100, // Load all replies (preview will show only 2)
            orderBy: { createdAt: 'asc' },
            include: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                  profilePhotoUrl: true,
                },
              },
            },
          },
          _count: {
            select: { replies: true },
          },
        },
      },
      _count: {
        select: { likes: true },
      },
    },
  } as any);

  const hasMore = posts.length === limit;
  const nextCursor = hasMore ? posts[posts.length - 1].createdAt.toISOString() : null;

  return {
    posts: posts.map((post: any) => ({
      ...post,
      isLikedByCurrentUser: post.likes.length > 0,
      likeCount: post._count.likes,
      comments: post.comments,
    })),
    nextCursor,
    hasMore,
  };
}

export default function PostsFollowing({ loaderData }: Route.ComponentProps) {
  const { posts, nextCursor, hasMore } = loaderData;

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-6">Following Feed</h1>

        {posts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                No posts from people you follow yet. Start following climbers to see their posts here!
              </p>
              <a
                href="/discover"
                className="inline-block mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Discover Climbers
              </a>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {posts.map((post: any) => (
              <Card key={post.id}>
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-4">
                    {post.user.profilePhotoUrl ? (
                      <img
                        src={post.user.profilePhotoUrl}
                        alt={post.user.displayName}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                        {post.user.displayName[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <a
                        href={`/users/${post.user.displayName}`}
                        className="font-semibold hover:underline"
                      >
                        {post.user.displayName}
                      </a>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {post.textContent && (
                    <p className="mb-4 whitespace-pre-wrap">{post.textContent}</p>
                  )}
                  {post.mediaUrls.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {post.mediaUrls.map((url: string, index: number) => (
                        <img
                          key={index}
                          src={url}
                          alt={`Post media ${index + 1}`}
                          className="w-full h-48 object-cover rounded-md"
                        />
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-4 pt-4 border-t dark:border-gray-700">
                    <span className="flex items-center gap-2">
                      <span>{post.isLikedByCurrentUser ? '❤️' : '🤍'}</span>
                      <span>{post.likeCount}</span>
                    </span>
                    <a
                      href={`/posts/${post.id}`}
                      className="text-gray-500 dark:text-gray-400 hover:text-blue-600"
                    >
                      View Details
                    </a>
                  </div>
                </div>
              </Card>
            ))}

            {hasMore && (
              <div className="text-center">
                <a
                  href={`/posts/following?cursor=${nextCursor}`}
                  className="inline-block px-6 py-2 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700"
                >
                  Load More
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
