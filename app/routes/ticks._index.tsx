import type { Route } from "./+types/ticks._index";
import { useLoaderData, useNavigate, useSearchParams } from "react-router";
import { requireUser } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import TickList from "~/components/ticks/tick-list";
import TickFilters from "~/components/ticks/tick-filters";
import { useState } from "react";
import { PageWrapper } from "~/components/ui/page-wrapper";

export const loader = async ({ request }: Route.LoaderArgs) => {
  const user = await requireUser(request);
  const url = new URL(request.url);

  // Get filter parameters
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');
  const gradeFilter = url.searchParams.get('grade');
  const cragFilter = url.searchParams.get('crag');
  const typeFilter = url.searchParams.get('type');

  // Build filters
  const filters: any = { userId: user.id };

  if (startDate) {
    filters.date = { gte: new Date(startDate) };
  }

  if (endDate) {
    if (filters.date) {
      filters.date.lte = new Date(endDate);
    } else {
      filters.date = { lte: new Date(endDate) };
    }
  }

  // Get ticks with related route and crag data
  const ticks = await db.tick.findMany({
    where: filters,
    include: {
      route: {
        include: {
          crag: true,
        },
      },
    },
    orderBy: {
      date: 'desc',
    },
  });

  // Post-filter for grade, crag, type (since Prisma doesn't easily support nested string array filtering)
  let filtered = ticks;

  if (gradeFilter) {
    filtered = filtered.filter((t) => t.route.grade === gradeFilter);
  }

  if (cragFilter) {
    filtered = filtered.filter((t) => t.route.crag.id === cragFilter);
  }

  if (typeFilter) {
    filtered = filtered.filter((t) => t.route.type === typeFilter);
  }

  // Get list of crags for filter dropdown
  const crags = await db.crag.findMany({
    where: {
      routes: {
        some: {
          ticks: {
            some: { userId: user.id },
          },
        },
      },
    },
    select: {
      id: true,
      name: true,
    },
  });

  return {
    ticks: filtered,
    crags,
    filters: { startDate, endDate, gradeFilter, cragFilter, typeFilter },
  };
};

export default function TicksIndex() {
  const { ticks, crags, filters } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleFilterChange = (newFilters: Record<string, string | null>) => {
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    navigate(`/ticks?${params.toString()}`);
  };

  return (
    <PageWrapper maxWidth="4xl">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-primary">My Tick List</h1>

        <TickFilters crags={crags} onFilterChange={handleFilterChange} initialFilters={filters} />

        <div className="space-y-3 flex flex-col gap-0.5">
          {ticks.length === 0 ? (
            <div className="rounded-lg bg-surface p-8 text-center">
              <p className="text-muted">No ticks yet. Start logging your climbs!</p>
            </div>
          ) : (
            ticks.map((tick) => <TickList key={tick.id} tick={tick} />)
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
