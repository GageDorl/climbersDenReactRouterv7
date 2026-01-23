import { useLoaderData, useNavigate } from "react-router";
import { db } from "~/lib/db.server";
import { getUserId } from "~/lib/auth.server";
import TickList from "~/components/ticks/tick-list";
import TickFilters from "~/components/ticks/tick-filters";
import { PageWrapper } from "~/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import type { LoaderFunctionArgs } from "react-router";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const currentUserId = await getUserId(request);
  if (!currentUserId) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const targetUserId = params.userId;
  if (!targetUserId) {
    throw new Response("User ID is required", { status: 400 });
  }

  // Verify the user exists
  const user = await db.user.findUnique({
    where: { id: targetUserId },
    select: { displayName: true },
  });

  if (!user) {
    throw new Response("User not found", { status: 404 });
  }

  const url = new URL(request.url);

  // Get filter parameters
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");
  const gradeFilter = url.searchParams.get("grade");
  const cragFilter = url.searchParams.get("crag");
  const typeFilter = url.searchParams.get("type");

  // Build filters
  const filters: any = { userId: targetUserId };

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
      date: "desc",
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
            some: { userId: targetUserId },
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
    targetUsername: user.displayName,
  };
};

export default function UserTicksPage() {
  const { ticks, crags, filters, targetUsername } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('userId') || '';

  const handleFilterChange = (newFilters: Record<string, string | null>) => {
    const newParams = new URLSearchParams();
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) newParams.set(key, value);
    });
    navigate(`/ticks/user/${userId}?${newParams.toString()}`);
  };

  return (
    <PageWrapper>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{targetUsername}'s Ticks</CardTitle>
        </CardHeader>
        <CardContent>
          <TickFilters crags={crags} initialFilters={filters} onFilterChange={handleFilterChange} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {ticks.length === 0 ? (
            <p className="text-center text-gray-500">No ticks yet.</p>
          ) : (
            <div className="space-y-3">
              {ticks.map((tick: any) => <TickList key={tick.id} tick={tick} />)}
            </div>
          )}
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
