import type { Route } from './+types/crags._index';
import { Form, useNavigation, Link } from 'react-router';
import { PageWrapper } from '~/components/ui/page-wrapper';
import { CragCard } from '~/components/crags/crag-card';
import { searchAreasByName } from '~/lib/openbeta.server';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { getUser } from '~/lib/auth.server';

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const query = url.searchParams.get('q')?.trim() ?? '';

  const results = query ? await searchAreasByName(query, 20) : [];
  const user = await getUser(request);

  return { query, results, isLoggedIn: !!user };
}

export default function CragBrowser({ loaderData }: Route.ComponentProps) {
  const { query, results, isLoggedIn } = loaderData;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting' || navigation.state === 'loading';

  return (
    <PageWrapper maxWidth="4xl">
      {isLoggedIn && (
        <div className="mb-4 flex justify-end">
          <Link
            to="/crags/favorites"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            View my favorites →
          </Link>
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Find a Crag</CardTitle>
        </CardHeader>
        <CardContent>
          <Form method="get" className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search by name (e.g., Smith Rock)"
              className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-70"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Searching…' : 'Search'}
            </button>
          </Form>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Data provided by the public OpenBeta GraphQL API (no API key required).
          </p>
        </CardContent>
      </Card>

      {query && results.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-gray-600 dark:text-gray-400">
            No crags found matching "{query}".
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {results.map((area: Awaited<ReturnType<typeof searchAreasByName>>[number]) => (
          <CragCard key={area.uuid} area={area} />
        ))}
      </div>
    </PageWrapper>
  );
}
