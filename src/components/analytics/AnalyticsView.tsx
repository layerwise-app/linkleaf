import { ArrowDownRightIcon, ArrowUpRightIcon } from 'lucide-react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent
} from '~/components/ui/chart';
import type { ChartConfig } from '~/components/ui/chart';
import type { AnalyticsData } from '~/lib/analytics';
import { sourceLabel } from '~/lib/sources';

const chartConfig = {
  views: { label: 'Page views', color: 'var(--chart-1)' },
  clicks: { label: 'Link clicks', color: 'var(--chart-2)' }
} satisfies ChartConfig;

const number = new Intl.NumberFormat('en-US');
const percent = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 1
});

const shortDay = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  });

function Stat({
  label,
  value,
  current,
  previous,
  days
}: {
  label: string;
  value: string;
  current: number;
  previous: number;
  days: number;
}) {
  const change = previous > 0 ? (current - previous) / previous : null;
  return (
    <div role='group' aria-label={label} className='min-w-0 rounded-2xl border bg-card p-4 sm:p-5'>
      <p className='text-sm text-muted-foreground'>{label}</p>
      <p data-testid='stat-value' className='mt-1 font-heading text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl'>
        {value}
      </p>
      <p className='mt-1 flex items-center gap-1 text-xs text-muted-foreground'>
        {change === null ? (
          `No data from the ${days} days before`
        ) : (
          <>
            {change >= 0 ? (
              <ArrowUpRightIcon className='size-3.5' aria-label='Up' />
            ) : (
              <ArrowDownRightIcon className='size-3.5' aria-label='Down' />
            )}
            {percent.format(Math.abs(change))} vs. previous {days} days
          </>
        )}
      </p>
    </div>
  );
}

function RankedList({
  title,
  rows,
  columnLabel,
  empty
}: {
  title: string;
  rows: { key: string; label: string; value: number; note?: string }[];
  columnLabel: string;
  empty: string;
}) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <section className='min-w-0 rounded-2xl border bg-card p-4 sm:p-5'>
      <div className='flex items-baseline justify-between gap-3'>
        <h2 className='font-medium'>{title}</h2>
        <span className='text-xs text-muted-foreground'>{columnLabel}</span>
      </div>
      {rows.length === 0 ? (
        <p className='mt-4 text-sm text-muted-foreground'>{empty}</p>
      ) : (
        <ol className='mt-3 flex flex-col gap-3'>
          {rows.map((row) => (
            <li key={row.key}>
              <div className='flex items-baseline justify-between gap-3 text-sm'>
                <span className='min-w-0 truncate'>{row.label}</span>
                <span className='flex-none tabular-nums'>
                  {number.format(row.value)}
                  {row.note ? (
                    <span className='ml-2 text-xs text-muted-foreground'>{row.note}</span>
                  ) : null}
                </span>
              </div>
              <div className='mt-1.5 h-1 rounded-full bg-muted' aria-hidden='true'>
                <div
                  className='h-1 rounded-full bg-primary'
                  style={{ width: `${Math.max((row.value / max) * 100, 1.5)}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function AnalyticsView({
  data,
  rangeControl,
  sample = false
}: {
  data: AnalyticsData;
  rangeControl: React.ReactNode;
  sample?: boolean;
}) {
  const { totals, previous, days } = data;
  const hasActivity = totals.views > 0 || totals.clicks > 0;

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h1 className='font-heading text-2xl font-semibold tracking-tight sm:text-3xl'>
            Analytics
          </h1>
          <p className='text-sm text-muted-foreground'>
            {sample
              ? 'Sample numbers, so you can see what you’ll get.'
              : 'Counted without storing IP addresses. Days are in UTC.'}
          </p>
        </div>
        {rangeControl}
      </div>

      <div className='grid grid-cols-2 gap-3 lg:grid-cols-3'>
        <Stat
          label='Page views'
          value={number.format(totals.views)}
          current={totals.views}
          previous={previous.views}
          days={days}
        />
        <Stat
          label='Link clicks'
          value={number.format(totals.clicks)}
          current={totals.clicks}
          previous={previous.clicks}
          days={days}
        />
        <div className='col-span-2 lg:col-span-1'>
          <Stat
            label='Click-through rate'
            value={percent.format(totals.ctr)}
            current={totals.ctr}
            previous={previous.ctr}
            days={days}
          />
        </div>
      </div>

      <section className='rounded-2xl border bg-card p-4 sm:p-5'>
        <h2 className='mb-3 font-medium'>Views and clicks by day</h2>
        <ChartContainer config={chartConfig} className='aspect-auto h-64 w-full'>
          <LineChart data={data.daily} margin={{ left: 0, right: 8, top: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey='day'
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={28}
              tickFormatter={shortDay}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={36}
            />
            <ChartTooltip
              content={<ChartTooltipContent labelFormatter={(day) => shortDay(String(day))} />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Line
              dataKey='views'
              type='monotone'
              stroke='var(--color-views)'
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              dataKey='clicks'
              type='monotone'
              stroke='var(--color-clicks)'
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ChartContainer>
        {!hasActivity ? (
          <p className='mt-3 text-center text-sm text-muted-foreground'>
            Nothing yet. Share your link and your first visits will show up here.
          </p>
        ) : null}
        <details className='mt-3 text-sm'>
          <summary className='cursor-pointer text-muted-foreground'>Show as a table</summary>
          <div className='mt-2 max-h-64 overflow-auto'>
            <table className='w-full text-left tabular-nums'>
              <thead>
                <tr className='text-muted-foreground'>
                  <th className='py-1 font-normal'>Day</th>
                  <th className='py-1 text-right font-normal'>Views</th>
                  <th className='py-1 text-right font-normal'>Clicks</th>
                </tr>
              </thead>
              <tbody>
                {[...data.daily].reverse().map((row) => (
                  <tr key={row.day} className='border-t'>
                    <td className='py-1'>{shortDay(row.day)}</td>
                    <td className='py-1 text-right'>{number.format(row.views)}</td>
                    <td className='py-1 text-right'>{number.format(row.clicks)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      <div className='grid gap-4 lg:grid-cols-2'>
        <RankedList
          title='Top links'
          columnLabel='Clicks'
          empty='No clicks in this period.'
          rows={data.topLinks.map((link) => ({
            key: link.id,
            label: link.title,
            value: link.clicks
          }))}
        />
        <RankedList
          title='Top sources'
          columnLabel='Views · clicks'
          empty='No visits in this period.'
          rows={data.topSources.map((row) => ({
            key: row.source,
            label: sourceLabel(row.source),
            value: row.views,
            note: `${number.format(row.clicks)} clicks`
          }))}
        />
      </div>
    </div>
  );
}
