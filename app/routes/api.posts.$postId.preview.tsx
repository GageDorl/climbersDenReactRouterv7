import type { Route } from './+types/api.posts.$postId.preview';
import { db } from '~/lib/db.server';

export async function loader({ request, params }: Route.LoaderArgs) {
  const postId = params.postId;

  // Only allow GET for this preview endpoint
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  try {
    const accept = request.headers.get('accept');
    const secFetchMode = request.headers.get('sec-fetch-mode');
    const secFetchDest = request.headers.get('sec-fetch-dest');
    const referer = request.headers.get('referer');
    const ua = request.headers.get('user-agent');
    console.log(`[preview loader] postId=${postId} accept=${accept} sec-fetch-mode=${secFetchMode} sec-fetch-dest=${secFetchDest} referer=${referer} ua=${ua?.slice(0,80)}`);
  } catch (e) {
    console.log('[preview loader] called (no request headers)');
  }

  if (!postId) {
    return new Response(JSON.stringify({ error: 'Post ID required' }), { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }

  try {
    const post = await db.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        textContent: true,
        mediaUrls: true,
        user: {
          select: {
            id: true,
            displayName: true,
            profilePhotoUrl: true,
          },
        },
      },
    });

    if (!post) {
      return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    }

    const caption = post.textContent ? post.textContent.slice(0, 120) : null;

    const payload = {
      id: post.id,
      textContent: post.textContent,
      mediaUrls: post.mediaUrls,
      user: post.user,
      caption,
    };

    // Always return JSON regardless of request Accept header. Disable caching
    // to avoid conditional requests (304) from dev middleware or the browser.
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'Vary': 'Accept',
      },
    });
  } catch (err) {
    console.error('[preview loader] internal error', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'Vary': 'Accept',
      },
    });
  }
}

export default function Route() {
  return null;
}
