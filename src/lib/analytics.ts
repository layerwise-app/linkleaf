export const ANALYTICS_RANGES = [7, 30] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

export type AnalyticsData = {
  days: AnalyticsRange;
  totals: { views: number; clicks: number; ctr: number };
  /** The same totals for the period just before this one. */
  previous: { views: number; clicks: number; ctr: number };
  daily: { day: string; views: number; clicks: number }[];
  topLinks: { id: string; title: string; clicks: number }[];
  topSources: { source: string; views: number; clicks: number }[];
};

const DAY_MS = 86_400_000;

export const utcDay = (time: number) =>
  new Date(time).toISOString().slice(0, 10);

/** The last `days` UTC dates, oldest first, ending today. */
export function dayRange(days: number, now: number): string[] {
  return Array.from({ length: days }, (_, i) =>
    utcDay(now - (days - 1 - i) * DAY_MS)
  );
}

export const clickThroughRate = (views: number, clicks: number) =>
  views > 0 ? clicks / views : 0;

/** Fills in the days with no activity so charts keep an honest time axis. */
export function fillDays(
  days: string[],
  rows: { day: string; views: number; clicks: number }[]
) {
  const byDay = new Map(rows.map((row) => [row.day, row]));
  return days.map(
    (day) => byDay.get(day) ?? { day, views: 0, clicks: 0 }
  );
}
