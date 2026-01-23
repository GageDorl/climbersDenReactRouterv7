import type { OpenBetaClimb } from '~/lib/openbeta.server';
import { RouteItem } from './route-item';

export function RouteList({ climbs, cragId }: { climbs: OpenBetaClimb[]; cragId: string }) {
  if (!climbs.length) {
    return <p className="text-sm text-gray-600 dark:text-gray-400">No routes available for this crag.</p>;
  }

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
      {climbs.map(climb => (
        <RouteItem key={climb.uuid} climb={climb} cragId={cragId} />
      ))}
    </div>
  );
}
