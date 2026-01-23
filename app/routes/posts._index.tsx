import type { Route } from './+types/posts._index';
import { db } from '~/lib/db.server';
import { getUserId } from '~/lib/auth.server';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { PostCard } from '~/components/posts/post-card';
import { PageWrapper } from '~/components/ui/page-wrapper';

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await getUserId(request);
  if (!userId) {
    throw new Response('Unauthorized', { status: 401 });
  }

  const url = new URL(request.url);
  const cursor = url.searchParams.get('cursor');
  const limit = 20;

  // Cursor-based pagination for better performance
  const posts = await db.post.findMany({
    where: cursor ? { createdAt: { lt: new Date(cursor) } } : {},
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
    userId,
  };
}

export default function PostsIndex({ loaderData }: Route.ComponentProps) {
  const { posts, nextCursor, hasMore, userId } = loaderData;

  return (
    <PageWrapper>
      <Card className="mb-6">
          <CardHeader>
            <CardTitle>Community Feed</CardTitle>
          </CardHeader>
          <CardContent>
            <a
              href="/posts/new"
              className="block w-full px-4 py-2 text-center bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create Post
            </a>
          </CardContent>
        </Card>

        {posts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                No posts yet. Be the first to share something!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {posts.map((post: any) => (
              <PostCard 
                key={post.id} 
                post={post} 
                currentUserId={userId}
              />
            ))}

            {hasMore && (
              <div className="text-center">
                <a
                  href={`/posts?cursor=${nextCursor}`}
                  className="inline-block px-6 py-2 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700"
                >
                  Load More
                </a>
              </div>
            )}
          </div>
        )}
    </PageWrapper>
  );
}
