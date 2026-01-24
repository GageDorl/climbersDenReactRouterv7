import type { OpenBetaClimb } from '~/lib/openbeta.server';
import { Link } from 'react-router';
import { Button } from '~/components/ui/button';

function typeLabel(type?: OpenBetaClimb['type']) {
  if (!type) return 'Unknown';
  const entries: string[] = [];
  if (type.sport) entries.push('Sport');
  if (type.trad) entries.push('Trad');
  if (type.bouldering) entries.push('Boulder');
  if (type.tr) entries.push('TR');
  if (type.alpine) entries.push('Alpine');
  if (type.ice) entries.push('Ice');
  if (type.mixed) entries.push('Mixed');
  if (type.aid) entries.push('Aid');
  if (type.snow) entries.push('Snow');
  return entries.length ? entries.join(' / ') : 'Unknown';
}

export function RouteItem({ climb, cragId }: { climb: OpenBetaClimb; cragId: string }) {
  const openBetaUrl = `https://openbeta.io/climb/${climb.uuid}`;

  return (
    <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-secondary transition-colors">
      <a
        href={openBetaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 hover:underline"
      >
        <div className="flex items-center gap-2">
          <p className="font-semibold text-primary">{climb.name.substring(climb.name.length-5, climb.name.length)==", The" ? climb.name.substring(0, climb.name.length-5) + ", The" : climb.name}</p>
          <svg className="w-3 h-3 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </div>
        <p className="text-sm text-secondary">{typeLabel(climb.type)}</p>
      </a>
      
      <div className="flex items-center gap-3">
        <div className="text-sm text-primary font-medium whitespace-nowrap">
          {climb.yds || climb.grades?.yds || climb.grades?.french || '—'}
        </div>
        <Link 
          to={`/ticks/new?cragId=${cragId}`}
          className="inline-block"
        >
          <Button
            size="sm"
            variant="outline"
          >
            Tick
          </Button>
        </Link>
      </div>
    </div>
  );
}
