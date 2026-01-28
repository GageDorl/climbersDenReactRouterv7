import type { Route } from "./+types/settings.notifications";
import { Form, useLoaderData, useActionData } from "react-router";
import { getUserId } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { PageWrapper } from "~/components/ui/page-wrapper";
import { Button } from "~/components/ui/button";

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await getUserId(request);
  if (!userId) return new Response(null, { status: 401 });

  // Guard in case Prisma client hasn't been regenerated yet and the model is missing.
  let prefs = null as any;
  if ((db as any)?.notificationPreference && (db as any).notificationPreference.findUnique) {
    prefs = await (db as any).notificationPreference.findUnique({ where: { userId } });
  }

  return { prefs };
}

export async function action({ request }: Route.ActionArgs) {
  const userId = await getUserId(request);
  if (!userId) return new Response(null, { status: 401 });

  const form = await request.formData();
  const data = {
    messages: form.get('messages') === 'on',
    postLikes: form.get('postLikes') === 'on',
    postComments: form.get('postComments') === 'on',
    commentReplies: form.get('commentReplies') === 'on',
    gearListInvites: form.get('gearListInvites') === 'on',
    follows: form.get('follows') === 'on',
  };

  try {
    const upsert = (db as any)?.notificationPreference?.upsert;
    if (!upsert) {
      return { success: false, error: 'prisma_model_missing' };
    }

    await upsert.call((db as any).notificationPreference, {
      where: { userId },
      create: { userId, ...data },
      update: { ...data },
    });

    return { success: true };
  } catch (err) {
    console.error('Failed to persist notification preferences', err);
    return { success: false, error: 'upsert_failed' };
  }
}

export default function NotificationSettings() {
  const { prefs } = useLoaderData<typeof loader>();
  const actionData = useActionData();

  return (
    <PageWrapper>
      <div className="max-w-3xl mx-auto py-6">
        <h1 className="text-2xl font-bold mb-4">Notification Settings</h1>
        <Form method="post" className="space-y-4">
          <label className="flex items-center space-x-3">
            <input type="checkbox" name="messages" defaultChecked={prefs?.messages ?? true} />
            <span>Messages</span>
          </label>
          <label className="flex items-center space-x-3">
            <input type="checkbox" name="postLikes" defaultChecked={prefs?.postLikes ?? true} />
            <span>Likes on my posts</span>
          </label>
          <label className="flex items-center space-x-3">
            <input type="checkbox" name="postComments" defaultChecked={prefs?.postComments ?? true} />
            <span>Comments on my posts</span>
          </label>
          <label className="flex items-center space-x-3">
            <input type="checkbox" name="commentReplies" defaultChecked={prefs?.commentReplies ?? true} />
            <span>Replies to my comments</span>
          </label>
          <label className="flex items-center space-x-3">
            <input type="checkbox" name="gearListInvites" defaultChecked={prefs?.gearListInvites ?? true} />
            <span>Being added to gear lists</span>
          </label>
          <label className="flex items-center space-x-3">
            <input type="checkbox" name="follows" defaultChecked={prefs?.follows ?? true} />
            <span>New followers</span>
          </label>

          <div>
            <Button type="submit">Save Preferences</Button>
            {actionData?.success && <span className="ml-3 text-sm text-success">Saved</span>}
          </div>
        </Form>
      </div>
    </PageWrapper>
  );
}
