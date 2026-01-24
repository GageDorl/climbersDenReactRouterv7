import type { Route } from './+types/api.upload.signature';
import { getUserId } from '~/lib/auth.server';
import { generateUploadSignature } from '~/lib/cloudinary.server';

/**
 * GET /api/upload/signature?folder=posts/images&preset=post
 * Returns Cloudinary signed upload credentials for client-side uploads
 */
export async function loader({ request }: Route.LoaderArgs) {
  // Reject non-GET requests
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const userId = await getUserId(request);
    
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get folder and preset from query parameters
    const url = new URL(request.url);
    const folder = url.searchParams.get('folder') || 'posts/images';
    const preset = (url.searchParams.get('preset') || 'post') as 'profile' | 'post' | 'journal';

    // Generate signed upload credentials
    const config = await generateUploadSignature(folder, preset);

    return new Response(JSON.stringify(config), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Upload Signature] Error:', message);
    
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
