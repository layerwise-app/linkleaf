import { createFileRoute } from '@tanstack/react-router';
import { loadPublishedPaths } from '~/lib/pages.server';
import { sitemapPaths, siteUrl } from '~/lib/site';

// Lists `sitemapPaths` and every published page. Unpublished pages stay out.
export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        const staticUrls = sitemapPaths.map(
          (path) => `  <url><loc>${escapeXml(siteUrl(path))}</loc></url>`
        );
        const pageUrls = (await loadPublishedPaths()).map(
          ({ username, updatedAt }) =>
            `  <url><loc>${escapeXml(siteUrl(`/${username}`))}</loc><lastmod>${updatedAt.toISOString().slice(0, 10)}</lastmod></url>`
        );
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...staticUrls, ...pageUrls].join('\n')}\n</urlset>\n`,
          { headers: { 'content-type': 'application/xml; charset=utf-8' } }
        );
      }
    }
  }
});

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
