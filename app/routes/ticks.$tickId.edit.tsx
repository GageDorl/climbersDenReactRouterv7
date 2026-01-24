import type { Route } from "./+types/ticks.$tickId.edit";
import { useLoaderData } from "react-router";
import { requireUser } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import TickForm from "~/components/ticks/tick-form";
import { PageWrapper } from "~/components/ui/page-wrapper";

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const user = await requireUser(request);
  const tickId = params.tickId as string;

  const tick = await db.tick.findFirst({
    where: {
      id: tickId,
      userId: user.id,
    },
    include: {
      route: {
        include: {
          crag: true,
        },
      },
    },
  });

  if (!tick) {
    throw new Response('Tick not found', { status: 404 });
  }

  return { tick };
};

export const action = async ({ params, request }: Route.ActionArgs) => {
  const user = await requireUser(request);
  const tickId = params.tickId as string;

  const tick = await db.tick.findFirst({
    where: {
      id: tickId,
      userId: user.id,
    },
  });

  if (!tick) {
    throw new Response('Tick not found', { status: 404 });
  }

  const formData = await request.formData();
  const date = formData.get('date') as string;
  const sendStyle = formData.get('sendStyle') as string;
  const attempts = formData.get('attempts') ? Number(formData.get('attempts')) : null;
  const personalNotes = formData.get('personalNotes') as string;

  if (!date || !sendStyle) {
    throw new Response('Missing required fields', { status: 400 });
  }

  // Validate date
  const tickDate = new Date(date);
  if (tickDate > new Date()) {
    throw new Response('Tick date cannot be in the future', { status: 400 });
  }

  // Allow historical ticks; do not block dates before account creation.

  const sendStyleEnum = sendStyle as any;

  const updated = await db.tick.update({
    where: { id: tickId },
    data: {
      date: tickDate,
      sendStyle: sendStyleEnum,
      attempts,
      personalNotes: personalNotes || null,
    },
    include: {
      route: {
        include: {
          crag: true,
        },
      },
    },
  });

  return { tick: updated };
};

export default function EditTick() {
  const { tick } = useLoaderData<typeof loader>();

  return (
    <PageWrapper maxWidth="2xl">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-primary">Edit Tick: {tick.route.name}</h1>

        <TickForm
          routes={[tick.route as any]}
          initialTick={{
            id: tick.id,
            date: tick.date.toISOString().split('T')[0],
            sendStyle: tick.sendStyle,
            attempts: tick.attempts,
            personalNotes: tick.personalNotes || '',
          }}
          isEditing={true}
        />
      </div>
    </PageWrapper>
  );
}
