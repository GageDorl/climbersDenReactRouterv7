import { db } from '~/lib/db.server';
import { getUserId } from '~/lib/auth.server';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { PostGridPreview } from '~/components/posts/post-grid-preview';
import { PageWrapper } from '~/components/ui/page-wrapper';
import type { LoaderFunctionArgs } from 'react-router';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const currentUserId = await getUserId(request);
  if (!currentUserId) {
    throw new Response('Unauthorized', { status: 401 });
  }

  const targetUserId = params.userId;
  if (!targetUserId) {
    throw new Response('User ID is required', { status: 400 });
  }

  // Verify the user exists
  const user = await db.user.findUnique({
    where: { id: targetUserId },
    select: { displayName: true },
  });

  if (!user) {
    throw new Response('User not found', { status: 404 });
  }

  const url = new URL(request.url);
  const cursor = url.searchParams.get('cursor');
  const limit = 20;

  // Cursor-based pagination for better performance
  const posts = await db.post.findMany({
    where: {
      userId: targetUserId,
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
        where: { userId: currentUserId },
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
    currentUserId,
    targetUsername: user.displayName,
  };
}

export default function UserPostsPage({ loaderData, params }: { loaderData: Awaited<ReturnType<typeof loader>>; params: Record<string, string> }) {
  const { posts, nextCursor, hasMore, currentUserId, targetUsername } = loaderData;

  return (
    <PageWrapper>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-primary mb-6">{targetUsername}'s Posts</h1>
        
        {posts.length === 0 ? (
          <p className="text-center text-muted">No posts yet.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-1 sm:gap-2 md:gap-3 lg:gap-4">
              {posts.map((post: any) => (
                <PostGridPreview
                  key={post.id}
                  postId={post.id}
                  mediaUrl={post.mediaUrls[0]}
                  likeCount={post.likeCount}
                  commentCount={post.commentCount}
                  shareCount={post.shareCount || 0}
                />
              ))}
            </div>

            {hasMore && (
              <div className="mt-6 text-center">
                <a
                  href={`/posts/user/${params.userId}?cursor=${nextCursor}`}
                  className="link-primary"
                >
                  Load more posts
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </PageWrapper>
  );
}
