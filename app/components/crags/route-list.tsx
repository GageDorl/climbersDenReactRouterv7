import type { OpenBetaClimb } from '~/lib/openbeta.server';
import { RouteItem } from './route-item';

export function RouteList({ climbs, cragId }: { climbs: OpenBetaClimb[]; cragId: string }) {
  if (!climbs.length) {
    return <p className="text-sm text-muted">No routes available for this crag.</p>;
  }

  return (
    <div className="divide-y divide-default border border-default rounded-lg overflow-hidden">
      {climbs.map(climb => (
        <RouteItem key={climb.uuid} climb={climb} cragId={cragId} />
      ))}
    </div>
  );
}
