import type { Route } from "./+types/api.user.location";
import { z } from "zod";
import { getUserId } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { reverseGeocode } from "~/lib/geo-utils";

const updateLocationSchema = z.object({
  latitude: z.string().transform(val => parseFloat(val)).pipe(z.number().min(-90).max(90)),
  longitude: z.string().transform(val => parseFloat(val)).pipe(z.number().min(-180).max(180)),
  granted: z.string().transform(val => val === 'true'),
});

export async function action({ request }: Route.ActionArgs) {
  const userId = await getUserId(request);
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse form data instead of JSON
  const formData = await request.formData();
  const body = Object.fromEntries(formData);
  const result = updateLocationSchema.safeParse(body);

  if (!result.success) {
    return Response.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    );
  }

  const { latitude, longitude, granted } = result.data;

  // Get current user to check rate limiting
  const currentUser = await db.user.findUnique({
    where: { id: userId },
    select: { lastLocationUpdate: true },
  });

  if (!currentUser) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  // Rate limit: Only allow update if > 5 minutes since last update
  if (currentUser.lastLocationUpdate && granted) {
    const timeSinceLastUpdate = Date.now() - currentUser.lastLocationUpdate.getTime();
    const fiveMinutesMs = 5 * 60 * 1000;

    if (timeSinceLastUpdate < fiveMinutesMs) {
      const waitSeconds = Math.ceil((fiveMinutesMs - timeSinceLastUpdate) / 1000);
      return Response.json(
        {
          error: `Too many location updates. Please wait ${waitSeconds} seconds.`,
          retryAfter: waitSeconds,
        },
        { status: 429 }
      );
    }
  }

  // Reverse geocode to get city name
  let locationCity: string | null = null;
  if (granted) {
    try {
      locationCity = await reverseGeocode(latitude, longitude);
    } catch (error) {
      console.error("Reverse geocoding failed:", error);
      // Continue anyway, just without city name
    }
  }

  // Update user location
  await db.user.update({
    where: { id: userId },
    data: {
      latitude: granted ? latitude : null,
      longitude: granted ? longitude : null,
      locationCity: granted ? locationCity : null,
      locationPermissionGranted: granted,
      lastLocationUpdate: new Date(),
    },
  });

  return Response.json({
    success: true,
    locationCity,
  });
}
