import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '~/components/ui/button';
import type { Crag } from '~/types/db';

interface TickFiltersProps {
  crags: { id: string; name: string }[];
  initialFilters: Record<string, string | null>;
  onFilterChange: (filters: Record<string, string | null>) => void;
}

export default function TickFilters({ crags, initialFilters, onFilterChange }: TickFiltersProps) {
  const [searchParams] = useSearchParams();

  const handleReset = () => {
    onFilterChange({
      startDate: null,
      endDate: null,
      grade: null,
      crag: null,
      type: null,
    });
  };

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
          <input
            type="date"
            defaultValue={initialFilters.startDate || ''}
            onChange={(e) =>
              onFilterChange({
                ...initialFilters,
                startDate: e.target.value || null,
              })
            }
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
          <input
            type="date"
            defaultValue={initialFilters.endDate || ''}
            onChange={(e) =>
              onFilterChange({
                ...initialFilters,
                endDate: e.target.value || null,
              })
            }
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Crag</label>
          <select
            defaultValue={initialFilters.crag || ''}
            onChange={(e) =>
              onFilterChange({
                ...initialFilters,
                crag: e.target.value || null,
              })
            }
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
          >
            <option value="">All Crags</option>
            {crags.map((crag) => (
              <option key={crag.id} value={crag.id}>
                {crag.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Grade</label>
          <select
            defaultValue={initialFilters.gradeFilter || ''}
            onChange={(e) =>
              onFilterChange({
                ...initialFilters,
                gradeFilter: e.target.value || null,
              })
            }
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
          >
            <option value="">All Grades</option>
            <option value="5.5">5.5</option>
            <option value="5.6">5.6</option>
            <option value="5.7">5.7</option>
            <option value="5.8">5.8</option>
            <option value="5.9">5.9</option>
            <option value="5.10a">5.10a</option>
            <option value="5.10b">5.10b</option>
            <option value="5.10c">5.10c</option>
            <option value="5.10d">5.10d</option>
            <option value="5.11a">5.11a</option>
            <option value="5.11b">5.11b</option>
            <option value="5.11c">5.11c</option>
            <option value="5.11d">5.11d</option>
            <option value="5.12a">5.12a</option>
            <option value="5.12b">5.12b</option>
            <option value="5.12c">5.12c</option>
            <option value="5.12d">5.12d</option>
          </select>
        </div>

        <Button variant="outline" onClick={handleReset} className="mt-6">
          Reset Filters
        </Button>
      </div>
    </div>
  );
}
