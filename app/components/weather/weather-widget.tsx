import type { WeatherDay } from '~/lib/weather.server';

function suitabilityBadge(s: WeatherDay['suitability']) {
  if (s === 'good') return 'badge-success';
  if (s === 'fair') return 'badge-accent';
  return 'badge-destructive';
}

function formatDate(iso: string) {
  const date = new Date(iso);
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const weekday = weekdays[date.getDay()];
  const month = months[date.getMonth()];
  const day = date.getDate();
  return `${weekday}, ${month} ${day}`;
}

export function WeatherWidget({ forecast }: { forecast: WeatherDay[] }) {
  if (!forecast.length) {
    return <p className="text-sm text-muted">Weather unavailable.</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {forecast.map(day => (
        <div
          key={day.date}
          className="border border-default rounded-lg p-3 flex flex-col gap-2 bg-surface"
        >
          <div className="flex items-center justify-between text-sm text-primary font-medium">
            <span>{formatDate(day.date)}</span>
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${suitabilityBadge(day.suitability)}`}>
              {day.suitability.toUpperCase()}
            </span>
          </div>
          <div className="text-sm text-primary flex items-center gap-2">
            <span className="text-lg font-semibold">{Math.round(day.tempHigh)}°</span>
            <span className="text-xs text-muted">/ {Math.round(day.tempLow)}°</span>
            <span className="text-xs text-muted">{Math.round(day.windSpeed)} mph wind</span>
          </div>
          <div className="text-xs text-muted">
            {day.summary} · {Math.round(day.precipitationChance * 100)}% precip
          </div>
        </div>
      ))}
    </div>
  );
}
