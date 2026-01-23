import type { Route } from "./+types/ticks.new";
import { useLoaderData, useSearchParams, useFetcher, redirect } from "react-router";
import { requireUser } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { getAreaWithClimbs } from "~/lib/openbeta.server";
import TickForm from "~/components/ticks/tick-form";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { PageWrapper } from "~/components/ui/page-wrapper";

export const loader = async ({ request }: Route.LoaderArgs) => {
  const user = await requireUser(request);
  const url = new URL(request.url);
  const cragId = url.searchParams.get("cragId");

  // Require cragId - user can only log ticks from a route/crag page
  if (!cragId) {
    return redirect("/crags");
  }

  let routes: any[] = [];
  let cragName = "";

  try {
    const area = await getAreaWithClimbs(cragId);
    if (area) {
      cragName = area.name;
      // Convert OpenBeta climbs to local route format for display
      routes = area.climbs.map((climb) => ({
        uuid: climb.uuid,
        name: climb.name,
        grade: climb.yds || climb.grades?.yds || climb.grades?.french || "—",
        type: climb.type,
        cragId,
        crag: {
          id: cragId,
          name: cragName,
        },
      }));
    }
  } catch (err) {
    console.error("Failed to fetch crag", err);
    return redirect("/crags");
  }

  return { cragId, cragName, routes, userId: user.id };
};

export const action = async ({ request }: Route.ActionArgs) => {
  const user = await requireUser(request);
  const formData = await request.formData();

  const routeUuid = formData.get("routeUuid") as string;
  const routeName = formData.get("routeName") as string;
  const routeGrade = formData.get("routeGrade") as string;
  const routeType = formData.get("routeType") as string;
  const cragId = formData.get("cragId") as string;
  const date = formData.get("date") as string;
  const sendStyle = formData.get("sendStyle") as string;
  const attempts = formData.get("attempts") ? Number(formData.get("attempts")) : null;
  const personalNotes = formData.get("personalNotes") as string;

  if (!routeUuid || !date || !sendStyle) {
    throw new Response("Missing required fields", { status: 400 });
  }

  // Validate date is not in future
  const tickDate = new Date(date);
  if (tickDate > new Date()) {
    throw new Response("Tick date cannot be in the future", { status: 400 });
  }

  // Validate date is not before user account creation
  const user_data = await db.user.findUnique({ where: { id: user.id } });
  if (user_data && tickDate < user_data.createdAt) {
    throw new Response("Tick date cannot be before account creation", { status: 400 });
  }

  // Check for duplicate tick using OpenBeta UUID
  const existingTick = await db.tick.findFirst({
    where: {
      userId: user.id,
      route: {
        name: routeName,
      },
      date: {
        gte: new Date(date),
        lt: new Date(new Date(date).getTime() + 86400000), // Same day
      },
    },
  });

  if (existingTick) {
    throw new Response("You already have a tick for this route on this date", {
      status: 400,
    });
  }

  // Find or create route in database
  let route = await db.route.findFirst({
    where: {
      name: routeName,
      cragId,
    },
  });

  if (!route) {
    route = await db.route.create({
      data: {
        name: routeName,
        grade: routeGrade,
        type: (routeType as any) || "sport",
        cragId,
      },
    });
  }

  // Create the tick
  const sendStyleEnum = sendStyle as any;

  const tick = await db.tick.create({
    data: {
      userId: user.id,
      routeId: route.id,
      date: tickDate,
      sendStyle: sendStyleEnum,
      attempts,
      personalNotes: personalNotes || null,
    },
  });

  return { tickId: tick.id };
};

export default function NewTick() {
  const { cragId, cragName, routes } = useLoaderData<typeof loader>();
  const [selectedRoute, setSelectedRoute] = useState<(typeof routes)[0] | null>(
    routes.length === 1 ? routes[0] : null
  );
  const [showForm, setShowForm] = useState(false);

  return (
    <PageWrapper maxWidth="2xl">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Log New Tick</h1>

        {cragId && (
          <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900 p-4">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              Logging tick for: <span className="font-semibold">{cragName}</span>
            </p>
          </div>
        )}

        {routes.length > 0 ? (
          <>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Select Route</h2>
              <div className="grid gap-2">
                {routes.map((route) => (
                  <button
                    key={route.uuid}
                    onClick={() => {
                      setSelectedRoute(route);
                      setShowForm(true);
                    }}
                    className={`p-4 rounded-lg border text-left transition-colors ${
                      selectedRoute?.uuid === route.uuid
                        ? "border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/50"
                        : "border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    <p className="font-semibold text-gray-900 dark:text-white">{route.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {route.grade} • {Object.entries(route.type || {})
                        .filter(([, v]) => v)
                        .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1))
                        .join(" / ")}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {selectedRoute && showForm && (
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
                <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Tick Details</h2>
                <TickFormForNewTick route={selectedRoute} />
              </div>
            )}
          </>
        ) : (
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              No routes available. Please select a crag first.
            </p>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}

function TickFormForNewTick({ route }: { route: any }) {
  const fetcher = useFetcher();
  const [showForm, setShowForm] = useState(true);

  const sendStyles = ["redpoint", "flash", "onsight", "project", "toprope", "follow"];

  return (
    <fetcher.Form method="POST" className="space-y-4">
      <input type="hidden" name="routeUuid" value={route.uuid} />
      <input type="hidden" name="routeName" value={route.name} />
      <input type="hidden" name="routeGrade" value={route.grade} />
      <input type="hidden" name="routeType" value={Object.keys(route.type || {}).find((k) => route.type[k]) || "sport"} />
      <input type="hidden" name="cragId" value={route.cragId} />

      <div>
        <label className="block text-sm font-medium text-gray-700">Date Climbed</label>
        <input
          type="date"
          name="date"
          required
          max={new Date().toISOString().split("T")[0]}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Send Style</label>
        <select
          name="sendStyle"
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
        >
          <option value="">Select send style...</option>
          {sendStyles.map((style) => (
            <option key={style} value={style}>
              {style.charAt(0).toUpperCase() + style.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Attempts (optional)</label>
        <input
          type="number"
          name="attempts"
          min="1"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Personal Notes</label>
        <textarea
          name="personalNotes"
          maxLength={1000}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          rows={4}
          placeholder="What do you remember about this climb?"
        />
      </div>

      <Button type="submit" disabled={fetcher.state !== "idle"}>
        {fetcher.state !== "idle" ? "Saving..." : "Log Tick"}
      </Button>
    </fetcher.Form>
  );
}
