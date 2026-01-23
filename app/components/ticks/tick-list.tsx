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
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">{tick.route.name}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {tick.route.crag.name} • {tick.route.type} • {tick.route.grade}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              {new Date(tick.date).toLocaleDateString()} • {tick.sendStyle}
            </p>
            {tick.personalNotes && (
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{tick.personalNotes}</p>
            )}
          </div>
          {tick.attempts && (
            <div className="ml-4 rounded-lg bg-gray-50 dark:bg-gray-700 px-3 py-1 text-center">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Attempts</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{tick.attempts}</p>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
