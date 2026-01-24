import { Form, redirect } from "react-router";
import { requireUserId } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { PageWrapper } from "~/components/ui/page-wrapper";

export async function action({ request }: any) {
  const userId = await requireUserId(request);
  const form = await request.formData();
  const name = form.get('name')?.toString() || '';
  const description = form.get('description')?.toString() || '';
  const tripDateRaw = form.get('tripDate')?.toString();
  const tripDate = tripDateRaw ? new Date(tripDateRaw) : null;

  if (!name.trim()) {
    return new Response('Name required', { status: 400 });
  }

  const gearList = await db.gearList.create({
    data: {
      creatorId: userId,
      name: name.trim(),
      description: description || null,
      tripDate: tripDate || undefined,
      participantIds: [userId],
    },
  });

  return redirect(`/gear/${gearList.id}`);
}

export default function GearNew() {
  return (
    <PageWrapper maxWidth="2xl">
      <h1 className="text-2xl font-bold text-primary mb-4">New Gear List</h1>
      <Form method="post" className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-secondary">Name</label>
          <input name="name" className="mt-1 block w-full rounded border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-secondary">Description</label>
          <textarea name="description" className="mt-1 block w-full rounded border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-secondary">Trip Date</label>
          <input type="date" name="tripDate" className="mt-1 block rounded border px-3 py-2" />
        </div>
        <div>
          <button type="submit" className="rounded-lg btn-primary px-4 py-2">Create</button>
        </div>
      </Form>
    </PageWrapper>
  );
}
