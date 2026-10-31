import { waitUntil } from 'cloudflare:workers';
import { lt, sql } from 'drizzle-orm';
import { db } from '~/db';
import { rateLimits } from '~/db/schema';
import { config } from '~/linkleaf.config';
import type { RateLimitScope } from '~/linkleaf.config';
import { visitorHash } from '~/lib/request.server';

export type RateLimitResult = { allowed: boolean; retryAfter: number };

/**
 * Counts one attempt for this visitor. A single atomic upsert, so concurrent
 * requests can't slip past the limit. If the database is unavailable the request
 * is allowed: a rate limiter shouldn't be able to take the site down.
 */
export async function hitRateLimit(
  scope: RateLimitScope,
  headers: Headers
): Promise<RateLimitResult> {
  const { limit, windowSeconds } = config.rateLimits[scope];
  const now = Date.now();
  try {
    const key = await visitorHash(scope, headers);
    const resetAt = now + windowSeconds * 1000;
    const [row] = await db
      .insert(rateLimits)
      .values({ key, count: 1, resetAt })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: {
          count: sql`CASE WHEN ${rateLimits.resetAt} <= ${now} THEN 1 ELSE ${rateLimits.count} + 1 END`,
          resetAt: sql`CASE WHEN ${rateLimits.resetAt} <= ${now} THEN ${resetAt} ELSE ${rateLimits.resetAt} END`
        }
      })
      .returning({ count: rateLimits.count, resetAt: rateLimits.resetAt });

    // Now and then, clear out windows that have ended.
    if (Math.random() < 0.01) {
      waitUntil(db.delete(rateLimits).where(lt(rateLimits.resetAt, now)).run());
    }
    return {
      allowed: row.count <= limit,
      retryAfter: Math.max(1, Math.ceil((row.resetAt - now) / 1000))
    };
  } catch (error) {
    console.error('[rate-limit]', error);
    return { allowed: true, retryAfter: 0 };
  }
}
