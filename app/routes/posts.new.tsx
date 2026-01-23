import { redirect } from 'react-router';
import type { Route } from './+types/posts.new';
import { getUserId } from '~/lib/auth.server';
import { db } from '~/lib/db.server';
import { uploadFileToCloudinary } from '~/lib/cloudinary.server';
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

  // Handle multiple media files
  const mediaFiles: File[] = [];
  for (const [key, value] of formData.entries()) {
    if (key === 'media' && value instanceof File && value.size > 0) {
      mediaFiles.push(value);
    }
  }

  // Validate at least text or media present
  if (textContent.trim().length === 0 && mediaFiles.length === 0) {
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
  if (mediaFiles.length > 10) {
    return new Response(
      JSON.stringify({ error: 'Maximum 10 media files allowed per post' }),
      { status: 400 }
    );
  }

  // Check if any file is a video
  const hasVideo = mediaFiles.some((file) => file.type.startsWith('video/'));

  if (hasVideo && mediaFiles.length > 1) {
    return new Response(
      JSON.stringify({ error: 'Only 1 video allowed per post (or multiple images)' }),
      { status: 400 }
    );
  }

  // Validate video file size (max 100MB)
  if (hasVideo) {
    const videoFile = mediaFiles[0];
    const maxVideoSize = 100 * 1024 * 1024; // 100MB in bytes
    if (videoFile.size > maxVideoSize) {
      return new Response(
        JSON.stringify({ error: 'Video must be less than 100MB' }),
        { status: 400 }
      );
    }
  }

  // Validate image file sizes
  const maxImageSize = 100 * 1024 * 1024; // 100MB in bytes
  for (const file of mediaFiles) {
    if (file.size > maxImageSize) {
      return new Response(
        JSON.stringify({ error: `File "${file.name}" exceeds maximum size of 100MB` }),
        { status: 400 }
      );
    }
  }

  try {
    // Upload media files to Cloudinary
    const mediaUrls: string[] = [];
    for (const file of mediaFiles) {
      const isVideo = file.type.startsWith('video/');
      try {
        const result = await uploadFileToCloudinary(
          file,
          isVideo ? 'posts/videos' : 'posts/images'
        );
        mediaUrls.push(result.secure_url);
      } catch (uploadError) {
        console.error('Upload error:', uploadError);
        return new Response(
          JSON.stringify({ error: `Failed to upload ${file.name}. Please try again.` }),
          { status: 500 }
        );
      }
    }

    // Create post in database
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
