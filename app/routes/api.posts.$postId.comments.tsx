import type { Route } from './+types/api.posts.$postId.comments';
import { db } from '~/lib/db.server';

export async function loader({ params, request }: Route.LoaderArgs) {
  const { postId } = params;
  
  if (!postId) {
    throw new Response('Post ID is required', { status: 400 });
  }

  // Get URL search params for pagination
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '3', 10);
  const cursor = url.searchParams.get('cursor') || undefined;

  try {
    // Fetch comments with cursor-based pagination
    const comments = await db.comment.findMany({
      where: {
        postId,
        parentCommentId: null, // Only top-level comments
        deletedAt: null,
      },
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
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                profilePhotoUrl: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1, // Fetch one extra to determine if there are more
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
    });

    const hasMore = comments.length > limit;
    const data = hasMore ? comments.slice(0, limit) : comments;
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;

    return new Response(JSON.stringify({
      comments: data,
      nextCursor,
      hasMore,
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    throw new Response('Failed to fetch comments', { status: 500 });
  }
}
