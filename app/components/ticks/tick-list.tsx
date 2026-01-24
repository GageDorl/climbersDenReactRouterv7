import { Link } from 'react-router';
import type { Tick } from '~/types/db';

interface TickListProps {
  tick: Tick & {
    route: {
      id: string;
      name: string;
      grade: string;
      type: string;
      crag: {
        id: string;
        name: string;
      };
    };
  };
}

export default function TickListItem({ tick }: TickListProps) {
  return (
    <Link to={`/ticks/${tick.id}`}>
      <div className="rounded-lg border-default bg-secondary p-4 transition-colors hover:bg-secondary">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-primary">{tick.route.name}</h3>
            <p className="text-sm text-secondary">
              {tick.route.crag.name} • {tick.route.type} • {tick.route.grade}
            </p>
            <p className="text-sm text-muted">
              {(() => {
                const date = new Date(tick.date);
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const month = months[date.getMonth()];
                const day = date.getDate();
                const year = date.getFullYear();
                return `${month} ${day}, ${year}`;
              })()} • {tick.sendStyle}
            </p>
            {tick.personalNotes && (
              <p className="mt-2 text-sm text-secondary line-clamp-2">{tick.personalNotes}</p>
            )}
          </div>
          {tick.attempts && (
            <div className="ml-4 rounded-lg bg-secondary px-3 py-1 text-center">
              <p className="text-xs font-medium text-muted">Attempts</p>
              <p className="text-lg font-bold text-primary">{tick.attempts}</p>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
