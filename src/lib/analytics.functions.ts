import { createServerFn } from '@tanstack/react-start';
import { and, desc, eq, gte, lt, sql } from 'drizzle-orm';
import { db } from '~/db';
import { linkDailyStats, links, pageDailyStats, pages } from '~/db/schema';
import { clickThroughRate, dayRange, fillDays } from '~/lib/analytics';
import type { AnalyticsData, AnalyticsRange } from '~/lib/analytics';
import { ownerMiddleware } from '~/lib/owner-middleware';

const views = sql<number>`COALESCE(SUM(${pageDailyStats.views}), 0)`;
const clicks = sql<number>`COALESCE(SUM(${pageDailyStats.clicks}), 0)`;

export const getAnalytics = createServerFn({ method: 'GET' })
  .middleware([ownerMiddleware])
  .validator((input: { days: number }) => ({
    days: (input.days === 30 ? 30 : 7) as AnalyticsRange
  }))
  .handler(async ({ data, context }): Promise<AnalyticsData | null> => {
    const [page] = await db
      .select({ id: pages.id })
      .from(pages)
      .where(eq(pages.userId, context.user.id))
      .limit(1);
    if (!page) return null;

    const now = Date.now();
    const range = dayRange(data.days, now);
    const start = range[0];
    const previousStart = dayRange(data.days * 2, now)[0];

    const inPage = eq(pageDailyStats.pageId, page.id);
    const [dailyRows, previousRows, sourceRows, linkRows] = await db.batch([
      db
        .select({ day: pageDailyStats.day, views, clicks })
        .from(pageDailyStats)
        .where(and(inPage, gte(pageDailyStats.day, start)))
        .groupBy(pageDailyStats.day),
      db
        .select({ views, clicks })
        .from(pageDailyStats)
        .where(
          and(
            inPage,
            gte(pageDailyStats.day, previousStart),
            lt(pageDailyStats.day, start)
          )
        ),
      db
        .select({ source: pageDailyStats.source, views, clicks })
        .from(pageDailyStats)
        .where(and(inPage, gte(pageDailyStats.day, start)))
        .groupBy(pageDailyStats.source)
        .orderBy(desc(views), desc(clicks))
        .limit(8),
      // SQLite takes the bare `title` from the row with the latest day, so a
      // deleted link still shows the last name it had. Both tables have a
      // `title`, and D1's batch mode collapses repeated names, hence the aliases.
      db
        .select({
          id: linkDailyStats.linkId,
          storedTitle: sql<string>`${linkDailyStats.title}`.as('stored_title'),
          latestDay: sql<string>`MAX(${linkDailyStats.day})`.as('latest_day'),
          currentTitle: sql<string | null>`${links.title}`.as('current_title'),
          clicks: sql<number>`SUM(${linkDailyStats.clicks})`.as('total_clicks')
        })
        .from(linkDailyStats)
        .leftJoin(links, eq(links.id, linkDailyStats.linkId))
        .where(
          and(eq(linkDailyStats.pageId, page.id), gte(linkDailyStats.day, start))
        )
        .groupBy(linkDailyStats.linkId)
        .orderBy(desc(sql`total_clicks`))
        .limit(10)
    ]);

    const daily = fillDays(range, dailyRows);
    const totalViews = daily.reduce((sum, row) => sum + row.views, 0);
    const totalClicks = daily.reduce((sum, row) => sum + row.clicks, 0);
    const previous = previousRows[0] ?? { views: 0, clicks: 0 };
    return {
      days: data.days,
      totals: {
        views: totalViews,
        clicks: totalClicks,
        ctr: clickThroughRate(totalViews, totalClicks)
      },
      previous: {
        views: previous.views,
        clicks: previous.clicks,
        ctr: clickThroughRate(previous.views, previous.clicks)
      },
      daily,
      topLinks: linkRows.map((row) => ({
        id: row.id,
        title: row.currentTitle ?? row.storedTitle,
        clicks: row.clicks
      })),
      topSources: sourceRows
    };
  });
