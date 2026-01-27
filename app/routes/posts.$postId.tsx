import type { Route } from './+types/posts.$postId';
import { db } from '~/lib/db.server';
import { getUserId } from '~/lib/auth.server';
import { PostCard } from '~/components/posts/post-card';
import { Button } from '~/components/ui/button';
import { PageWrapper } from '~/components/ui/page-wrapper';

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
          deletedAt: true,
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
              deletedAt: true,
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
                  deletedAt: true,
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
  // If the post's author has been soft-deleted, signal the UI to show a deleted message
  const authorDeleted = !!(postData.user && postData.user.deletedAt);

  if (authorDeleted) {
    return {
      post: { id: postData.id, deletedByUser: true },
      currentUserId: userId,
      deletedByUser: true,
    };
  }

  // Filter out comments (and their replies) authored by users who have been soft-deleted
  const filteredComments = (postData.comments || []).filter((c: any) => !(c.user && c.user.deletedAt)).map((c: any) => ({
    ...c,
    replies: (c.replies || []).filter((r: any) => !(r.user && r.user.deletedAt)),
  }));

  return {
    post: {
      id: postData.id,
      textContent: postData.textContent,
      mediaUrls: postData.mediaUrls,
      createdAt: postData.createdAt,
      updatedAt: postData.updatedAt,
      user: postData.user,
      comments: filteredComments,
      isLikedByCurrentUser: postData.likes.length > 0,
      likeCount: postData._count.likes,
      commentCount: postData.commentCount,
    },
    currentUserId: userId,
    deletedByUser: false,
  };
}

export default function PostDetail({ loaderData }: Route.ComponentProps) {
  const { post, currentUserId, deletedByUser } = loaderData;

  if (deletedByUser) {
    return (
      <PageWrapper>
        <div className="mb-4">
          <a href="/posts" className="link-primary">← Back to Feed</a>
        </div>
        <div className="p-8 bg-surface rounded-md text-center">
          <h2 className="text-xl font-semibold mb-2">Content unavailable</h2>
          <p className="text-secondary">This post is not available because the author deleted their account.</p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
        <div className="mb-4">
          <a
            href="/posts"
            className="link-primary"
          >
            ← Back to Feed
          </a>
        </div>

        <PostCard 
          key={post.id} 
          post={post} 
          currentUserId={currentUserId}
          initialShowComments={false}
        />
      </PageWrapper>
  );
}
