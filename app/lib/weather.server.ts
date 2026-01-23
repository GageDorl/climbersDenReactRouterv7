const OPENWEATHER_BASES = [
  'https://api.openweathermap.org/data/3.0/onecall',
  'https://api.openweathermap.org/data/2.5/onecall',
];

export type WeatherDay = {
  date: string;
  tempHigh: number;
  tempLow: number;
  precipitationChance: number; // 0-1
  windSpeed: number; // mph
  summary: string;
  icon: string;
  suitability: 'good' | 'fair' | 'poor';
};

const cache = new Map<string, { expires: number; data: WeatherDay[] }>();
const TTL_MS = 24 * 60 * 60 * 1000; // 24h

function cacheKey(lat: number, lng: number) {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

function getSuitability(day: { temp: { max: number; min: number }; pop?: number; wind_speed?: number }): 'good' | 'fair' | 'poor' {
  const high = day.temp.max;
  const precip = day.pop ?? 0;
  const wind = day.wind_speed ?? 0;

  const tempOk = high >= 45 && high <= 80;
  const tempHot = high > 88 || high < 35;
  const precipBad = precip > 0.4;
  const windBad = wind > 22;

  if (tempOk && precip <= 0.2 && wind <= 15) return 'good';
  if (tempHot || precipBad || windBad) return 'poor';
  return 'fair';
}

export async function getWeatherForecast(lat: number, lng: number): Promise<WeatherDay[]> {
  const key = process.env.OPENWEATHER_API_KEY ?? process.env.OPENWEATHERMAP_API_KEY;
  if (!key) {
    throw new Error('OPENWEATHER_API_KEY or OPENWEATHERMAP_API_KEY is not set');
  }

  const cKey = cacheKey(lat, lng);
  const hit = cache.get(cKey);
  if (hit && hit.expires > Date.now()) {
    return hit.data;
  }

  let lastError: Error | null = null;

  for (const base of OPENWEATHER_BASES) {
    const url = new URL(base);
    url.searchParams.set('lat', lat.toString());
    url.searchParams.set('lon', lng.toString());
    url.searchParams.set('exclude', 'minutely,hourly,alerts,current');
    url.searchParams.set('units', 'imperial');
    url.searchParams.set('appid', key);

    const res = await fetch(url.toString());
    if (!res.ok) {
      const body = await res.text();
      lastError = new Error(`OpenWeather request failed (${res.status}) via ${base}: ${body || 'no body returned'}`);
      // Try fallback endpoint on auth or availability errors
      if (res.status === 401 || res.status === 403 || res.status === 404) {
        continue;
      }
      break;
    }

    const json = await res.json();
    if (!json?.daily) {
      lastError = new Error(`OpenWeather response missing daily forecast from ${base}`);
      continue;
    }

    const forecast: WeatherDay[] = (json.daily as any[]).slice(0, 7).map(day => {
      const suitability = getSuitability(day);
      return {
        date: new Date(day.dt * 1000).toISOString(),
        tempHigh: day.temp?.max ?? 0,
        tempLow: day.temp?.min ?? 0,
        precipitationChance: day.pop ?? 0,
        windSpeed: day.wind_speed ?? 0,
        summary: day.weather?.[0]?.description ?? 'N/A',
        icon: day.weather?.[0]?.icon ?? '01d',
        suitability,
      } satisfies WeatherDay;
    });

    cache.set(cKey, { data: forecast, expires: Date.now() + TTL_MS });
    return forecast;
  }

  throw lastError ?? new Error('OpenWeather request failed for all endpoints');
}
