const DEFAULT_OPENBETA_URL = process.env.OPENBETA_API_URL ?? 'https://api.openbeta.io/';

interface GraphQLError {
  message: string;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
}

export type OpenBetaAreaSummary = {
  id: string;
  uuid: string;
  name: string;
  totalClimbs: number;
  latitude: number | null;
  longitude: number | null;
};

export type OpenBetaClimbType = {
  trad?: boolean;
  sport?: boolean;
  bouldering?: boolean;
  tr?: boolean;
  alpine?: boolean;
  ice?: boolean;
  mixed?: boolean;
  aid?: boolean;
  snow?: boolean;
};

export type OpenBetaGrade = {
  yds?: string | null;
  french?: string | null;
};

export type OpenBetaClimb = {
  id: string;
  uuid: string;
  name: string;
  yds?: string | null;
  grades?: OpenBetaGrade | null;
  type?: OpenBetaClimbType | null;
};

export type OpenBetaAreaDetails = {
  id: string;
  uuid: string;
  name: string;
  totalClimbs: number;
  latitude: number | null;
  longitude: number | null;
  children: OpenBetaAreaSummary[];
  climbs: OpenBetaClimb[];
  ancestors: Array<{ uuid: string; name: string }>;
};

const cache = new Map<string, { expires: number; data: unknown }>();

function getCache<T>(key: string) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) {
    cache.delete(key);
    return null;
  }
  return hit.data as T;
}

function setCache(key: string, data: unknown, ttlMs: number) {
  cache.set(key, { data, expires: Date.now() + ttlMs });
}

async function openBetaRequest<T>(
  query: string,
  variables: Record<string, unknown>,
  cacheKey: string,
  cacheTtlMs: number
): Promise<T> {
  if (cacheTtlMs > 0) {
    const cached = getCache<T>(cacheKey);
    if (cached) return cached;
  }

  const response = await fetch(DEFAULT_OPENBETA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenBeta HTTP error:', {
      status: response.status,
      body: errorText,
      query,
      variables,
    });
    throw new Error(`OpenBeta request failed with status ${response.status}: ${errorText}`);
  }

  const json = (await response.json()) as GraphQLResponse<T>;

  if (json.errors?.length) {
    const message = json.errors.map(err => err.message).join('; ');
    console.error('OpenBeta GraphQL errors:', {
      errors: json.errors,
      query,
      variables,
    });
    throw new Error(`OpenBeta GraphQL error: ${message}`);
  }

  if (!json.data) {
    throw new Error('OpenBeta GraphQL returned no data');
  }

  if (cacheTtlMs > 0) {
    setCache(cacheKey, json.data, cacheTtlMs);
  }

  return json.data;
}

export async function searchAreasByName(name: string, limit = 20, cacheTtlMs = 10 * 60 * 1000) {
  const trimmed = name.trim();
  if (!trimmed) return [] as OpenBetaAreaSummary[];

  const query = `
    query SearchAreas($name: String!, $limit: Int) {
      areas(filter: { area_name: { match: $name } }, limit: $limit) {
        id
        uuid
        area_name
        totalClimbs
        metadata { lat lng }
      }
    }
  `;

  const data = await openBetaRequest<{ areas: Array<{
    id: string;
    uuid: string;
    area_name: string;
    totalClimbs: number;
    metadata?: { lat?: number; lng?: number } | null;
  }> }>(query, { name: trimmed, limit }, `areas:${trimmed}:${limit}`, cacheTtlMs);

  return (data.areas || []).map(area => ({
    id: area.id,
    uuid: area.uuid,
    name: area.area_name,
    totalClimbs: area.totalClimbs ?? 0,
    latitude: area.metadata?.lat ?? null,
    longitude: area.metadata?.lng ?? null,
  } satisfies OpenBetaAreaSummary));
}

export async function getAreaWithClimbs(
  uuid: string,
  cacheTtlMs = 10 * 60 * 1000
): Promise<OpenBetaAreaDetails | null> {
  const query = `
    query AreaByUuid($uuid: ID!) {
      area(uuid: $uuid) {
        id
        uuid
        area_name
        totalClimbs
        metadata { lat lng }
        pathTokens
        ancestors
        children {
          id
          uuid
          area_name
          totalClimbs
          metadata { lat lng }
        }
        climbs {
          id
          uuid
          name
          yds
          grades { yds french }
          type { trad sport bouldering tr alpine ice mixed aid snow }
        }
      }
    }
  `;

  const data = await openBetaRequest<{ area: any | null }>(query, { uuid }, `area:${uuid}`, cacheTtlMs);
  if (!data.area) return null;

  const area = data.area;

  // Build ancestors from API-provided UUIDs; drop the last entry (current area)
  const ancestorsArray: Array<{ uuid: string; name: string }> = [];
  const ancestorUuids: string[] = Array.isArray(area.ancestors)
    ? area.ancestors.filter((id: unknown): id is string => typeof id === 'string' && Boolean(id))
    : [];

  const uuidsToResolve = ancestorUuids.length > 0 ? ancestorUuids.slice(0, -1) : [];

  // Resolve each ancestor's name with a minimal query by UUID
  for (const ancestorUuid of uuidsToResolve) {
    try {
      const nameQuery = `
        query AreaName($uuid: ID!) {
          area(uuid: $uuid) {
            uuid
            area_name
          }
        }
      `;
      const nameData = await openBetaRequest<{ area: any | null }>(
        nameQuery,
        { uuid: ancestorUuid },
        `area-name:${ancestorUuid}`,
        cacheTtlMs
      );
      if (nameData.area?.uuid && nameData.area?.area_name) {
        ancestorsArray.push({ uuid: nameData.area.uuid, name: nameData.area.area_name });
        continue;
      }
    } catch (error) {
      console.error(`Failed to resolve ancestor name for ${ancestorUuid}`, error);
    }
    // Fallback: use UUID as display if name lookup fails
    ancestorsArray.push({ uuid: ancestorUuid, name: ancestorUuid });
  }

  // Legacy fallback: if no ancestors returned, try pathTokens as [uuid, name] pairs
  if (ancestorsArray.length === 0) {
    const tokens: string[] = Array.isArray(area.pathTokens) ? area.pathTokens : [];
    const looksLikeUuid = (value: string) => typeof value === 'string' && value.includes('-') && value.length >= 8;
    if (tokens.length >= 2 && tokens.length % 2 === 0 && looksLikeUuid(tokens[0])) {
      for (let i = 0; i < tokens.length - 1; i += 2) {
        const candidateUuid = tokens[i];
        const name = tokens[i + 1];
        const isCurrent = name === area.area_name || candidateUuid === area.uuid;
        if (!isCurrent && name && candidateUuid) {
          ancestorsArray.push({ uuid: candidateUuid, name });
        }
      }
    }
  }

  return {
    id: area.id,
    uuid: area.uuid,
    name: area.area_name,
    totalClimbs: area.totalClimbs ?? 0,
    latitude: area.metadata?.lat ?? null,
    longitude: area.metadata?.lng ?? null,
    ancestors: ancestorsArray,
    children: (area.children || []).map((child: any) => ({
      id: child.id,
      uuid: child.uuid,
      name: child.area_name,
      totalClimbs: child.totalClimbs ?? 0,
      latitude: child.metadata?.lat ?? null,
      longitude: child.metadata?.lng ?? null,
    } satisfies OpenBetaAreaSummary)),
    climbs: (area.climbs || []).map((climb: any) => ({
      id: climb.id,
      uuid: climb.uuid,
      name: climb.name,
      yds: climb.yds ?? climb.grades?.yds ?? null,
      grades: climb.grades ?? null,
      type: climb.type ?? null,
    } satisfies OpenBetaClimb)),
  } satisfies OpenBetaAreaDetails;
}

/**
 * Get crags within a bounding box
 * @param maxLat Maximum latitude (north)
 * @param minLat Minimum latitude (south)
 * @param maxLng Maximum longitude (east)
 * @param minLng Minimum longitude (west)
 * @param zoom Map zoom level
 * @param limit Maximum number of results
 */
export async function getCragsWithinBbox(
  maxLat: number,
  minLat: number,
  maxLng: number,
  minLng: number,
  limit = 100,
  zoom = 10,
  cacheTtlMs = 5 * 60 * 1000
) {
  const query = `
    query CragsWithin($bbox: [Float!]!, $zoom: Float) {
      cragsWithin(filter: { bbox: $bbox, zoom: $zoom }) {
        id
        uuid
        area_name
        totalClimbs
        metadata { lat lng }
      }
    }
  `;

  // bbox format: [minLng, minLat, maxLng, maxLat] (west, south, east, north)
  const bbox = [minLng, minLat, maxLng, maxLat];
  const cacheKey = `crags_bbox:${maxLat}:${minLat}:${maxLng}:${minLng}:${zoom}`;

  try {
    const data = await openBetaRequest<{
      cragsWithin: Array<{
        id: string;
        uuid: string;
        area_name: string;
        totalClimbs: number;
        metadata?: { lat?: number; lng?: number } | null;
      }>;
    }>(query, { bbox, zoom }, cacheKey, cacheTtlMs);

    return (data.cragsWithin || []).map(area => ({
      id: area.id,
      uuid: area.uuid,
      name: area.area_name,
      totalClimbs: area.totalClimbs ?? 0,
      latitude: area.metadata?.lat ?? null,
      longitude: area.metadata?.lng ?? null,
    } satisfies OpenBetaAreaSummary));
  } catch (error) {
    console.error('getCragsWithinBbox error:', error);
    return [];
  }
}
