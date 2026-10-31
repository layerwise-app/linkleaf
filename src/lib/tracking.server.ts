import { sql } from 'drizzle-orm';
import { db } from '~/db';
import { linkDailyStats, pageDailyStats } from '~/db/schema';
import { utcDay } from '~/lib/analytics';

/** Counters only: a day, a source, and a number. Nothing about the visitor. */
export async function recordView(pageId: string, source: string) {
  await db
    .insert(pageDailyStats)
    .values({ pageId, day: utcDay(Date.now()), source, views: 1, clicks: 0 })
    .onConflictDoUpdate({
      target: [pageDailyStats.pageId, pageDailyStats.day, pageDailyStats.source],
      set: { views: sql`${pageDailyStats.views} + 1` }
    })
    .run();
}

export async function recordClick(
  pageId: string,
  link: { id: string; title: string },
  source: string
) {
  const day = utcDay(Date.now());
  await db.batch([
    db
      .insert(pageDailyStats)
      .values({ pageId, day, source, views: 0, clicks: 1 })
      .onConflictDoUpdate({
        target: [pageDailyStats.pageId, pageDailyStats.day, pageDailyStats.source],
        set: { clicks: sql`${pageDailyStats.clicks} + 1` }
      }),
    db
      .insert(linkDailyStats)
      .values({ linkId: link.id, pageId, day, title: link.title, clicks: 1 })
      .onConflictDoUpdate({
        target: [linkDailyStats.linkId, linkDailyStats.day],
        set: {
          title: link.title,
          clicks: sql`${linkDailyStats.clicks} + 1`
        }
      })
  ]);
}
