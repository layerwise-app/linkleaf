import { createFileRoute } from '@tanstack/react-router';
import { env, waitUntil } from 'cloudflare:workers';
import { loadPublicPage } from '~/lib/pages.server';
import { hitRateLimit } from '~/lib/rate-limit.server';
import { buildShareSvg } from '~/lib/share-image';
import { site } from '~/lib/site';
import { normalizeUsername } from '~/lib/usernames';

const FILE = /^([a-z0-9_-]+)\.png$/i;

const fallback = (request: Request) =>
  Response.redirect(new URL(site.image || '/', request.url).toString(), 302);

const toBase64 = (bytes: Uint8Array) => {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
};

/** Loads the avatar for embedding, or returns null to draw a monogram. */
async function avatarData(src: string | null, request: Request) {
  if (!src) return null;
  try {
    let bytes: Uint8Array;
    let type: string;
    if (src.startsWith('/media/')) {
      const object = await env.STORAGE.get(src.slice('/media/'.length));
      if (!object) return null;
      bytes = new Uint8Array(await new Response(object.body).arrayBuffer());
      type = object.contentType;
    } else {
      const response = await fetch(new URL(src, request.url));
      if (!response.ok) return null;
      bytes = new Uint8Array(await response.arrayBuffer());
      type = response.headers.get('content-type') ?? 'image/png';
    }
    return `data:${type};base64,${toBase64(bytes)}`;
  } catch {
    return null;
  }
}

const IMAGE_HEADERS = {
  'content-type': 'image/png',
  'cache-control': 'public, max-age=86400',
  'x-content-type-options': 'nosniff'
};

/**
 * Each page's link preview, drawn on first request and kept in Storage until
 * the page's look changes. Any failure falls back to the site's share image.
 */
export const Route = createFileRoute('/og/$file')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const match = FILE.exec(params.file);
        if (!match) return new Response('Not found', { status: 404 });
        const page = await loadPublicPage(normalizeUsername(match[1]));
        if (!page) return new Response('Not found', { status: 404 });

        // The image shows the site's address, and the local preview shares this
        // Storage with the published app, so each address keeps its own copy.
        const host = new URL(site.url || request.url).host;
        const folder = `og/${page.id}/${host.replace(/[^a-zA-Z0-9.-]/g, '-')}/`;
        const key = `${folder}${page.shareVersion}.png`;
        // A Storage problem only costs us the cached copy; the image can still be drawn.
        const stored = await env.STORAGE.get(key).catch(() => null);
        if (stored) {
          return new Response(stored.body, { headers: IMAGE_HEADERS });
        }

        try {
          // Drawing is the expensive part, so that's what gets rate limited.
          const limit = await hitRateLimit('shareImage', request.headers);
          if (!limit.allowed) return fallback(request);

          const { renderPng } = await import('~/lib/share-image.server');
          const png = await renderPng(
            buildShareSvg({
              username: page.username,
              displayName: page.displayName,
              bio: page.bio,
              titles: page.links.map((link) => link.title),
              theme: page.theme,
              avatarDataUrl: await avatarData(page.avatar, request),
              host
            })
          );
          waitUntil(replaceStoredImage(folder, key, png));
          return new Response(png as BodyInit, { headers: IMAGE_HEADERS });
        } catch (error) {
          console.error('[share-image]', error);
          return fallback(request);
        }
      }
    }
  }
});

async function replaceStoredImage(folder: string, key: string, png: Uint8Array) {
  try {
    await env.STORAGE.put(key, png, { contentType: 'image/png' });
    const { objects } = await env.STORAGE.list({ prefix: folder });
    const outdated = objects.map((o) => o.key).filter((k) => k !== key);
    if (outdated.length > 0) await env.STORAGE.delete(outdated);
  } catch (error) {
    console.error('[share-image] could not store', error);
  }
}
