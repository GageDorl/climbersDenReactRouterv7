import { useFetcher } from 'react-router';
import { useState } from 'react';
import { Button } from '~/components/ui/button';
import type { Route as RouteType } from '~/types/db';

interface TickFormProps {
  routes: RouteType[];
  initialTick?: {
    id: string;
    date: string;
    sendStyle: string;
    attempts?: number | null;
    personalNotes?: string;
  };
  isEditing?: boolean;
}

export default function TickForm({ routes, initialTick, isEditing }: TickFormProps) {
  const fetcher = useFetcher();
  const [selectedRoute, setSelectedRoute] = useState<string>(initialTick?.id || (routes && routes[0]?.id) || '');

  const sendStyles = ['redpoint', 'flash', 'onsight', 'project', 'toprope', 'follow'];

  return (
    <fetcher.Form method={isEditing ? 'PATCH' : 'POST'} className="space-y-4">
      {isEditing ? (
        <div>
          <label className="block text-sm font-medium text-secondary">Route</label>
          <div className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-surface text-primary">
            {routes[0]?.name} - {routes[0]?.grade} ({routes[0]?.type})
          </div>
          <input type="hidden" name="routeId" value={routes[0]?.id} />
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-secondary">Route</label>
          <select
            name="routeId"
            required
            defaultValue={selectedRoute}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="">Select a route...</option>
            {routes.map((route) => (
              <option key={route.id} value={route.id}>
                {route.name} - {route.grade} ({route.type})
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-secondary">Date Climbed</label>
        <input
          type="date"
          name="date"
          required
          defaultValue={initialTick?.date}
          className="mt-1 block w-full rounded-md border border-default bg-surface px-3 py-2 text-primary"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-secondary">Send Style</label>
        <select
          name="sendStyle"
          required
          defaultValue={initialTick?.sendStyle || ''}
          className="mt-1 block w-full rounded-md border border-default bg-surface px-3 py-2 text-primary"
        >
          <option value="">Select send style...</option>
          {sendStyles.map((style) => (
            <option key={style} value={style}>
              {style.charAt(0).toUpperCase() + style.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-secondary">Attempts (optional)</label>
        <input
          type="number"
          name="attempts"
          min="1"
          defaultValue={initialTick?.attempts || ''}
          className="mt-1 block w-full rounded-md border border-default bg-surface px-3 py-2 text-primary"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-secondary">Personal Notes</label>
        <textarea
          name="personalNotes"
          maxLength={1000}
          defaultValue={initialTick?.personalNotes || ''}
          className="mt-1 block w-full rounded-md border border-default bg-surface px-3 py-2 text-primary"
          rows={4}
          placeholder="What do you remember about this climb?"
        />
      </div>

      <Button type="submit" disabled={fetcher.state !== 'idle'}>
        {fetcher.state !== 'idle'
          ? 'Saving...'
          : isEditing
            ? 'Update Tick'
            : 'Log Tick'}
      </Button>
    </fetcher.Form>
  );
}
