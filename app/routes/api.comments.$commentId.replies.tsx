import type { Route } from './+types/api.comments.$commentId.replies';
import { db } from '~/lib/db.server';

export async function loader({ params, request }: Route.LoaderArgs) {
  const { commentId } = params;
  
  if (!commentId) {
    throw new Response('Comment ID is required', { status: 400 });
  }

  // Get URL search params for pagination
  const url = new URL(request.url);
  const skip = parseInt(url.searchParams.get('skip') || '2', 10); // Skip the already loaded ones

  try {
    // Fetch remaining replies
    const replies = await db.comment.findMany({
      where: {
        parentCommentId: commentId,
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
      },
      orderBy: { createdAt: 'asc' }, // Match initial replies order (oldest first)
      skip: skip,
    });

    return {
      replies,
    };
  } catch (error) {
    console.error('Failed to fetch replies:', error);
    throw new Response('Failed to fetch replies', { status: 500 });
  }
}
