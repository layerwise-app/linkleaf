import { createFileRoute } from '@tanstack/react-router';
import { env, waitUntil } from 'cloudflare:workers';

// Only uploaded avatars can be read through this route. The pattern can't match
// anything else in the project's Storage, and keys include a random ID.
const AVATAR_KEY = /^avatars\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-]+\.(jpg|png|webp)$/;

/**
 * Serves avatars from the app's own address. Keys change with every upload, so
 * browsers and the edge cache can keep them for a year.
 */
export const Route = createFileRoute('/media/$')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const key = params._splat ?? '';
        if (!AVATAR_KEY.test(key)) {
          return new Response('Not found', { status: 404 });
        }
        const cache = (caches as unknown as { default: Cache }).default;
        const cached = await cache.match(request.url);
        if (cached) return cached;

        const object = await env.STORAGE.get(key);
        if (!object) return new Response('Not found', { status: 404 });

        const response = new Response(object.body, {
          headers: {
            'content-type': object.contentType,
            'cache-control': 'public, max-age=31536000, immutable',
            'x-content-type-options': 'nosniff',
            'content-security-policy': "default-src 'none'; sandbox"
          }
        });
        waitUntil(cache.put(request.url, response.clone()));
        return response;
      }
    }
  }
});
