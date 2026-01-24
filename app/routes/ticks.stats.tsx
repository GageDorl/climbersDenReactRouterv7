import type { Route } from "./+types/ticks.stats";
import { useLoaderData } from "react-router";
import { requireUser } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import StatsCard from "~/components/ticks/stats-card";
import { PageWrapper } from "~/components/ui/page-wrapper";

export const loader = async ({ request }: Route.LoaderArgs) => {
  const user = await requireUser(request);

  // Get all ticks for the user
  const ticks = await db.tick.findMany({
    where: { userId: user.id },
    include: {
      route: {
        select: {
          type: true,
          grade: true,
        },
      },
    },
  });

  // Calculate statistics
  const totalTicks = ticks.length;
  const ticksByType: Record<string, number> = {};
  const ticksByGrade: Record<string, number> = {};
  const ticksByMonth: Record<string, number> = {};

  ticks.forEach((tick) => {
    // Count by type
    ticksByType[tick.route.type] = (ticksByType[tick.route.type] || 0) + 1;

    // Count by grade
    ticksByGrade[tick.route.grade] = (ticksByGrade[tick.route.grade] || 0) + 1;

    // Count by month
    const monthKey = tick.date.toISOString().substring(0, 7);
    ticksByMonth[monthKey] = (ticksByMonth[monthKey] || 0) + 1;
  });

  // Get send style distribution
  const sendStyleDist: Record<string, number> = {};
  ticks.forEach((tick) => {
    sendStyleDist[tick.sendStyle] = (sendStyleDist[tick.sendStyle] || 0) + 1;
  });

  return {
    totalTicks,
    ticksByType,
    ticksByGrade,
    ticksByMonth,
    sendStyleDist,
  };
};

export default function TicksStats() {
  const { totalTicks, ticksByType, ticksByGrade, ticksByMonth, sendStyleDist } =
    useLoaderData<typeof loader>();

  return (
    <PageWrapper maxWidth="4xl">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-primary">Climbing Statistics</h1>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatsCard title="Total Ticks" value={totalTicks} />
          <StatsCard
            title="Climb Types"
            value={Object.keys(ticksByType).length}
            subtitle="Different types logged"
          />
          <StatsCard
            title="Grade Range"
            value={Object.keys(ticksByGrade).length}
            subtitle="Different grades climbed"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg border-default bg-surface p-6">
            <h2 className="mb-4 text-lg font-semibold text-primary">Ticks by Type</h2>
            <div className="space-y-2">
              {Object.entries(ticksByType)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="capitalize text-secondary">{type}</span>
                    <span className="font-semibold text-primary">{count}</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="rounded-lg border-default bg-surface p-6">
            <h2 className="mb-4 text-lg font-semibold text-primary">Send Styles</h2>
            <div className="space-y-2">
              {Object.entries(sendStyleDist)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([style, count]) => (
                  <div key={style} className="flex items-center justify-between">
                    <span className="capitalize text-secondary">{style}</span>
                    <span className="font-semibold text-primary">{count}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div className="rounded-lg border-default bg-surface p-6">
          <h2 className="mb-4 text-lg font-semibold text-primary">Monthly Activity</h2>
          <div className="space-y-2">
            {Object.entries(ticksByMonth)
              .sort()
              .reverse()
              .map(([month, count]) => (
                <div key={month} className="flex items-center justify-between">
                  <span className="text-secondary">{(() => {
                    const date = new Date(month + '-01');
                    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                    const monthName = months[date.getMonth()];
                    const year = date.getFullYear();
                    return `${monthName} ${year}`;
                  })()}</span>
                  <span className="font-semibold text-primary">{count} ticks</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
