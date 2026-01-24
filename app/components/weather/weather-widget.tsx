import type { WeatherDay } from '~/lib/weather.server';

function suitabilityBadge(s: WeatherDay['suitability']) {
  if (s === 'good') return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100';
  if (s === 'fair') return 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-100';
  return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100';
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
    return <p className="text-sm text-gray-600 dark:text-gray-400">Weather unavailable.</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {forecast.map(day => (
        <div
          key={day.date}
          className="border border-gray-200 dark:border-gray-800 rounded-lg p-3 flex flex-col gap-2 bg-white dark:bg-gray-900"
        >
          <div className="flex items-center justify-between text-sm text-gray-900 dark:text-gray-100 font-medium">
            <span>{formatDate(day.date)}</span>
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${suitabilityBadge(day.suitability)}`}>
              {day.suitability.toUpperCase()}
            </span>
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <span className="text-lg font-semibold">{Math.round(day.tempHigh)}°</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">/ {Math.round(day.tempLow)}°</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{Math.round(day.windSpeed)} mph wind</span>
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {day.summary} · {Math.round(day.precipitationChance * 100)}% precip
          </div>
        </div>
      ))}
    </div>
  );
}
