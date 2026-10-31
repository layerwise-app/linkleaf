import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { AnalyticsView } from '~/components/analytics/AnalyticsView';
import { AppHeader } from '~/components/editor/AppHeader';
import { getAnalytics } from '~/lib/analytics.functions';
import { ANALYTICS_RANGES } from '~/lib/analytics';
import type { AnalyticsRange } from '~/lib/analytics';
import { cn } from '~/lib/utils';

export const Route = createFileRoute('/dashboard/analytics')({
  validateSearch: (search: Record<string, unknown>): { range: AnalyticsRange } => ({
    range: Number(search.range) === 30 ? 30 : 7
  }),
  loaderDeps: ({ search }) => ({ range: search.range }),
  loader: async ({ deps }) => {
    const data = await getAnalytics({ data: { days: deps.range } });
    if (!data) throw redirect({ to: '/dashboard/claim' });
    return data;
  },
  ssr: 'data-only',
  component: AnalyticsPage
});

function AnalyticsPage() {
  const data = Route.useLoaderData();
  const { range } = Route.useSearch();
  return (
    <>
      <AppHeader />
      <main className='mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-16 sm:px-6'>
        <AnalyticsView
          data={data}
          rangeControl={
            <div role='group' aria-label='Date range' className='flex gap-1 rounded-full bg-muted p-1'>
              {ANALYTICS_RANGES.map((days) => (
                <Link
                  key={days}
                  to='/dashboard/analytics'
                  search={{ range: days }}
                  aria-current={range === days ? 'true' : undefined}
                  className={cn(
                    'flex h-9 items-center rounded-full px-3.5 text-sm font-medium',
                    range === days
                      ? 'bg-card shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {days} days
                </Link>
              ))}
            </div>
          }
        />
      </main>
    </>
  );
}
