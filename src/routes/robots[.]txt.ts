import { createFileRoute } from '@tanstack/react-router';
import { siteUrl } from '~/lib/site';

// Signed-in pages, the API, and click redirects stay out of search. Rules match
// by prefix, so `/dashboard$` and `/dashboard/` are spelled out to avoid hiding
// someone whose username merely starts with "dashboard". Sign-in and Try mode
// use `seo({ noindex: true })` instead.
export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: () =>
        new Response(
          [
            'User-agent: *',
            'Disallow: /api/',
            'Disallow: /go/',
            'Disallow: /dashboard$',
            'Disallow: /dashboard/',
            '',
            `Sitemap: ${siteUrl('/sitemap.xml')}`,
            ''
          ].join('\n'),
          { headers: { 'content-type': 'text/plain; charset=utf-8' } }
        )
    }
  }
});
