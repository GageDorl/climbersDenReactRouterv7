import type { Route } from "./+types/api.user.location";
import { z } from "zod";
import { getUserId } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { reverseGeocode } from "~/lib/geo-utils";

const updateLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  granted: z.boolean(),
});

export async function action({ request }: Route.ActionArgs) {
  const userId = await getUserId(request);
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const result = updateLocationSchema.safeParse(body);

  if (!result.success) {
    return Response.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    );
  }

  const { latitude, longitude, granted } = result.data;

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
