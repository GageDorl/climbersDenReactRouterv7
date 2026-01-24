import { Link } from 'react-router';
import type { OpenBetaAreaSummary } from '~/lib/openbeta.server';
import { Card } from '~/components/ui/card';

function formatCoords(lat: number | null, lng: number | null) {
  if (lat == null || lng == null) return 'Coords unavailable';
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

export function CragCard({ area }: { area: OpenBetaAreaSummary }) {
  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-primary">{area.name.substring(area.name.length-5, area.name.length)==", The" ? area.name.substring(0, area.name.length-5) + ", The" : area.name}</h3>
          <p className="text-sm text-secondary">{formatCoords(area.latitude, area.longitude)}</p>
          <p className="text-sm text-primary mt-1">Total routes: {area.totalClimbs}</p>
        </div>
        <Link
          to={`/crags/${area.uuid}`}
          className="link-primary text-sm font-medium"
        >
          View details
        </Link>
      </div>
    </Card>
  );
}
