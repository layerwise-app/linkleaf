import { createFileRoute } from '@tanstack/react-router';
import { auth } from '~/lib/auth';
import { hitRateLimit } from '~/lib/rate-limit.server';
import type { RateLimitScope } from '~/linkleaf.config';

/** Email codes can create accounts too, so they share the sign-up limit. */
function scopeFor(pathname: string): RateLimitScope | null {
  const path = pathname.replace(/^\/api\/auth/, '');
  if (path.startsWith('/sign-up') || path.startsWith('/email-otp/send')) {
    return 'signUp';
  }
  if (
    path.startsWith('/sign-in') ||
    path.startsWith('/email-otp') ||
    path.startsWith('/forget-password') ||
    path.startsWith('/request-password-reset') ||
    path.startsWith('/reset-password')
  ) {
    return 'signIn';
  }
  return null;
}

async function handlePost(request: Request) {
  const scope = scopeFor(new URL(request.url).pathname);
  if (scope) {
    const limit = await hitRateLimit(scope, request.headers);
    if (!limit.allowed) {
      return Response.json(
        {
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many attempts. Please wait a while and try again.'
        },
        { status: 429, headers: { 'retry-after': String(limit.retryAfter) } }
      );
    }
  }
  return auth.handler(request);
}

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request }) => auth.handler(request),
      POST: ({ request }) => handlePost(request)
    }
  }
});
