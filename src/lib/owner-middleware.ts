import { createMiddleware } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { auth } from '~/lib/auth';
import { isSameOrigin } from '~/lib/request.server';

/**
 * Every server function that touches an owner's data runs behind this. Queries
 * then filter by `context.user.id`; no function accepts a page or user ID from
 * the browser, so there's no way to name someone else's page.
 */
export const ownerMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const headers = getRequestHeaders();
    if (!isSameOrigin(headers)) throw new Error('Forbidden');
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error('Please sign in again.');
    return next({ context: { user: session.user } });
  }
);
