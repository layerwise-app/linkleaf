import { createFileRoute } from '@tanstack/react-router';
import { waitUntil } from 'cloudflare:workers';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '~/db';
import { pages } from '~/db/schema';
import { hitRateLimit } from '~/lib/rate-limit.server';
import { isSameOrigin } from '~/lib/request.server';
import { classifySource, isBot } from '~/lib/sources';
import { recordView } from '~/lib/tracking.server';
import { normalizeUsername } from '~/lib/usernames';

type ViewBody = { username?: unknown; referrer?: unknown; utmSource?: unknown };

const text = (value: unknown, max: number) =>
  typeof value === 'string' ? value.slice(0, max) : null;

/**
 * Called once by a page after it loads, so previews, crawlers, and route
 * preloading don't count as views. Replies with the visitor's source, which the
 * page attaches to its links so clicks get credited to the same place.
 */
export const Route = createFileRoute('/api/track/view')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isSameOrigin(request.headers)) {
          return new Response('Forbidden', { status: 403 });
        }
        let body: ViewBody;
        try {
          body = (await request.json()) as ViewBody;
        } catch {
          return new Response('Bad request', { status: 400 });
        }
        const userAgent = request.headers.get('user-agent');
        const source = classifySource({
          referrer: text(body.referrer, 2048),
          utmSource: text(body.utmSource, 100),
          userAgent,
          ownHost: new URL(request.url).hostname
        });
        const username = text(body.username, 100);
        if (username && !isBot(userAgent)) {
          waitUntil(
            countView(normalizeUsername(username), source, request.headers).catch(
              (error: unknown) => {
                console.error('[view]', error);
              }
            )
          );
        }
        return Response.json({ source });
      }
    }
  }
});

async function countView(username: string, source: string, headers: Headers) {
  const limit = await hitRateLimit('view', headers);
  if (!limit.allowed) return;
  const [page] = await db
    .select({ id: pages.id })
    .from(pages)
    .where(
      and(
        eq(pages.username, username),
        eq(pages.published, true),
        isNull(pages.exampleOrder)
      )
    )
    .limit(1);
  if (page) await recordView(page.id, source);
}
