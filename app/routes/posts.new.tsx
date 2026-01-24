import { redirect } from 'react-router';
import type { Route } from './+types/posts.new';
import { getUserId } from '~/lib/auth.server';
import { db } from '~/lib/db.server';
import { CreatePostForm } from '~/components/posts/create-post-form';

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await getUserId(request);
  if (!userId) {
    throw redirect('/auth/login');
  }

  return {};
}

export async function action({ request }: Route.ActionArgs) {
  const userId = await getUserId(request);
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const formData = await request.formData();
  const textContent = (formData.get('textContent') as string) || '';
  
  // Get media URLs (uploaded client-side to Cloudinary)
  const mediaUrls: string[] = [];
  for (const [key, value] of formData.entries()) {
    if (key === 'mediaUrl' && typeof value === 'string' && value.trim()) {
      mediaUrls.push(value.trim());
    }
  }

  // Validate at least text or media present
  if (textContent.trim().length === 0 && mediaUrls.length === 0) {
    return new Response(
      JSON.stringify({ error: 'Post must contain text content or media' }),
      { status: 400 }
    );
  }

  // Validate text content length if provided
  if (textContent.length > 2000) {
    return new Response(
      JSON.stringify({ error: 'Text content must be 2000 characters or less' }),
      { status: 400 }
    );
  }

  // Validate media count (max 10 items)
  if (mediaUrls.length > 10) {
    return new Response(
      JSON.stringify({ error: 'Maximum 10 media files allowed per post' }),
      { status: 400 }
    );
  }

  try {
    // Create post in database with Cloudinary URLs
    const post = await db.post.create({
      data: {
        userId,
        textContent: textContent.trim() || null,
        mediaUrls,
      },
    });

    return redirect(`/posts/${post.id}`);
  } catch (error) {
    console.error('Error creating post:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create post. Please try again.' }),
      { status: 500 }
    );
  }
}

export default function NewPost() {
  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-4">
          <a
            href="/posts"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm font-medium"
          >
            ← Back to Feed
          </a>
        </div>

        <CreatePostForm />
      </div>
    </div>
  );
}
