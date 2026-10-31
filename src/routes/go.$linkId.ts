import { createFileRoute } from '@tanstack/react-router';
import { waitUntil } from 'cloudflare:workers';
import { eq } from 'drizzle-orm';
import { db } from '~/db';
import { links, pages } from '~/db/schema';
import { hitRateLimit } from '~/lib/rate-limit.server';
import { isLinkLive } from '~/lib/schedule';
import { classifySource, cleanSource, isBot } from '~/lib/sources';
import { recordClick } from '~/lib/tracking.server';
import { isSafeRedirect } from '~/lib/url-safety';

const redirectTo = (location: string, request: Request) =>
  new Response(null, {
    status: 302,
    headers: {
      location: new URL(location, request.url).toString(),
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex'
    }
  });

/**
 * Every link click goes through here: count it, then send the visitor on. The
 * visitor is never held up or turned away for analytics. Counting happens after
 * the response, and past the rate limit the redirect still works uncounted.
 */
export const Route = createFileRoute('/go/$linkId')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const [row] = await db
          .select({
            id: links.id,
            title: links.title,
            url: links.url,
            enabled: links.enabled,
            startsAt: links.startsAt,
            endsAt: links.endsAt,
            pageId: pages.id,
            username: pages.username,
            published: pages.published,
            exampleOrder: pages.exampleOrder
          })
          .from(links)
          .innerJoin(pages, eq(links.pageId, pages.id))
          .where(eq(links.id, params.linkId))
          .limit(1);

        if (!row) return redirectTo('/', request);
        const pagePath = `/${row.username}`;
        if (!row.published) return redirectTo('/', request);

        // A stale tab can hold a link that has since ended or been hidden.
        const live = isLinkLive(
          {
            enabled: row.enabled,
            startsAt: row.startsAt?.getTime() ?? null,
            endsAt: row.endsAt?.getTime() ?? null
          },
          Date.now()
        );
        if (!live) return redirectTo(pagePath, request);

        if (row.exampleOrder !== null) {
          const notice = new URLSearchParams({
            from: row.username,
            title: row.title
          });
          return redirectTo(`/example-link?${notice}`, request);
        }

        // Checked again at the last moment, however the URL got into the table.
        if (!isSafeRedirect(row.url)) return redirectTo(pagePath, request);

        const userAgent = request.headers.get('user-agent');
        const isPrefetch =
          request.headers.get('sec-purpose')?.includes('prefetch') ||
          request.headers.get('purpose') === 'prefetch';
        if (request.method === 'GET' && !isPrefetch && !isBot(userAgent)) {
          const url = new URL(request.url);
          const source =
            cleanSource(url.searchParams.get('s')) ??
            classifySource({
              referrer: request.headers.get('referer'),
              userAgent,
              ownHost: url.hostname
            });
          waitUntil(
            hitRateLimit('click', request.headers)
              .then((limit) =>
                limit.allowed
                  ? recordClick(row.pageId, { id: row.id, title: row.title }, source)
                  : undefined
              )
              .catch((error: unknown) => {
                console.error('[click]', error);
              })
          );
        }

        return new Response(null, {
          status: 302,
          headers: {
            location: row.url,
            'cache-control': 'no-store',
            'x-robots-tag': 'noindex'
          }
        });
      }
    }
  }
});
