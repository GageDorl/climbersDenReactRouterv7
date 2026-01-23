import type { Route } from './+types/posts.$postId';
import { db } from '~/lib/db.server';
import { getUserId } from '~/lib/auth.server';
import { PostCard } from '~/components/posts/post-card';
import { Button } from '~/components/ui/button';

export async function loader({ params, request }: Route.LoaderArgs) {
  const userId = await getUserId(request);
  if (!userId) {
    throw new Response('Unauthorized', { status: 401 });
  }

  const post = await db.post.findUnique({
    where: { id: params.postId },
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
      _count: {
        select: { likes: true },
      },
      comments: {
        where: { 
          deletedAt: null,
          parentCommentId: null, // Only top-level comments
        },
        orderBy: { createdAt: 'asc' }, // Oldest first (newest at bottom)
        take: 100, // Load all comments for detail view
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
            orderBy: { createdAt: 'asc' },
            take: 100, // Load all replies for detail view
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
        },
      },
    },
  } as any);

  if (!post) {
    throw new Response('Post not found', { status: 404 });
  }

  const postData = post as any;

  return {
    post: {
      id: postData.id,
      textContent: postData.textContent,
      mediaUrls: postData.mediaUrls,
      createdAt: postData.createdAt,
      updatedAt: postData.updatedAt,
      user: postData.user,
      comments: postData.comments,
      isLikedByCurrentUser: postData.likes.length > 0,
      likeCount: postData._count.likes,
      commentCount: postData.commentCount,
    },
    currentUserId: userId,
  };
}

export default function PostDetail({ loaderData }: Route.ComponentProps) {
  const { post, currentUserId } = loaderData;

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-4">
          <a
            href="/posts"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            ← Back to Feed
          </a>
        </div>

        <PostCard 
            key={post.id} 
            post={post} 
            currentUserId={currentUserId}
            initialShowComments={true}
        />
      </div>
    </div>
  );
}
