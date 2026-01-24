import type { Route } from "./+types/ticks.$tickId";
import { useLoaderData, useNavigate } from "react-router";
import { requireUser } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { Button } from "~/components/ui/button";
import RouteRating from "~/components/ticks/route-rating";
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
          routeRatings: {
            where: { userId: user.id },
          },
        },
      },
    },
  });

  if (!tick) {
    throw new Response('Tick not found', { status: 404 });
  }

  return {
    tick,
    userRating: tick.route.routeRatings[0] || null,
  };
};

export default function TickDetails() {
  const { tick, userRating } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  return (
    <PageWrapper maxWidth="2xl">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{tick.route.name}</h1>
            <p className="text-gray-600 dark:text-gray-400">
              {tick.route.crag.name} • {tick.route.type} • {tick.route.grade}
            </p>
          </div>
          <div className="space-x-2">
            <Button variant="outline" onClick={() => navigate(`/ticks/${tick.id}/edit`)}>
              Edit
            </Button>
            <Button variant="outline" onClick={() => navigate('/ticks')}>
              Back
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Climbed On</p>
              <p className="text-lg text-gray-900 dark:text-white">{(() => {
                const date = new Date(tick.date);
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const month = months[date.getMonth()];
                const day = date.getDate();
                const year = date.getFullYear();
                return `${month} ${day}, ${year}`;
              })()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Send Style</p>
              <p className="text-lg text-gray-900 dark:text-white capitalize">{tick.sendStyle}</p>
            </div>
            {tick.attempts && (
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Attempts</p>
                <p className="text-lg text-gray-900 dark:text-white">{tick.attempts}</p>
              </div>
            )}
          </div>

          {tick.personalNotes && (
            <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Notes</p>
              <p className="mt-2 text-gray-800 dark:text-gray-200">{tick.personalNotes}</p>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Rate This Route</h2>
          <RouteRating routeId={tick.route.id} initialRating={userRating?.starRating || 0} />
        </div>
      </div>
    </PageWrapper>
  );
}
