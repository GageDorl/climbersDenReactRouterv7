import { useFetcher, useSearchParams } from 'react-router';
import { useEffect, useState } from 'react';

interface RouteSearchProps {
  initialQuery: string;
  routes: any[];
}

export default function RouteSearch({ initialQuery, routes }: RouteSearchProps) {
  const fetcher = useFetcher();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    if (query) {
      fetcher.load(`/ticks/new?search=${encodeURIComponent(query)}`);
    }
  }, [query]);

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Search routes by name or crag..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="block w-full rounded-md border border-default bg-surface text-primary px-3 py-2"
      />

      {routes.length > 0 && (
        <div className="max-h-64 overflow-y-auto rounded-md border border-default bg-surface">
          {routes.map((route) => (
            <button
              key={route.id}
              onClick={() => {
                // Set the selected route by submitting form programmatically
                const routeInput = document.querySelector(
                  'select[name="routeId"]'
                ) as HTMLSelectElement;
                if (routeInput) {
                  routeInput.value = route.id;
                }
              }}
              className="block w-full border-b px-4 py-3 text-left hover:bg-secondary last:border-b-0"
            >
              <p className="font-medium text-primary">{route.name}</p>
              <p className="text-sm text-secondary">
                {route.crag.name} • {route.type} • {route.grade}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
