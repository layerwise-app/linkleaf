import { env } from 'cloudflare:workers';

/**
 * The visitor's address, set by Cloudflare and impossible for a client to
 * forge in production. Use it only to derive `visitorHash`; never store it.
 */
const clientIp = (headers: Headers) =>
  headers.get('cf-connecting-ip') ?? 'unknown';

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value)
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('');
}

/** A salted one-way hash, so rate-limit rows never contain an IP address. */
export function visitorHash(scope: string, headers: Headers): Promise<string> {
  const salt = env.BETTER_AUTH_SECRET || 'linkleaf-local';
  return sha256(`${salt}|${scope}|${clientIp(headers)}`);
}

/**
 * Sign-in cookies use `SameSite=None` so the embedded preview works, which
 * means browsers attach them to cross-site requests. State-changing endpoints
 * must therefore refuse requests that another site started.
 */
export function isSameOrigin(headers: Headers): boolean {
  const fetchSite = headers.get('sec-fetch-site');
  if (fetchSite) return fetchSite === 'same-origin' || fetchSite === 'none';
  const origin = headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === headers.get('host');
  } catch {
    return false;
  }
}
