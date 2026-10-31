import { config } from '~/linkleaf.config';

export type UrlCheck = { ok: true; url: string } | { ok: false; error: string };

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);
const SCHEME = /^([a-z][a-z0-9+.-]*):/i;
// `example.com:8080/path` looks like a scheme to a URL parser, but isn't one.
const HOST_WITH_PORT = /^[^\s/:@]+\.[^\s/:@]+:\d+(\/|$)/;
const EMAIL = /^[^\s@/:?#]+@[^\s@/:?#]+\.[^\s@/:?#]+$/;
// Browsers strip tabs, newlines, and other control characters out of URLs, which
// is how `java\nscript:` slips past naive checks. Refuse them outright.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

const REJECTED = 'Use a link that starts with https://, http://, or mailto:.';

/**
 * The one gate for every URL that can reach a visitor. Runs in the browser for
 * instant feedback and again on the server, where the result is final. Allows
 * only http, https, and mailto; a bare `example.com` becomes `https://`.
 */
export function checkUrl(raw: string): UrlCheck {
  const value = raw.trim();
  if (!value) return { ok: false, error: 'Enter a link.' };
  if (value.length > config.limits.urlMax) {
    return { ok: false, error: 'That link is too long.' };
  }
  if (CONTROL_CHARS.test(value) || value.includes('\\')) {
    return { ok: false, error: REJECTED };
  }

  let candidate = value;
  if (EMAIL.test(value)) {
    candidate = `mailto:${value}`;
  } else if (!SCHEME.test(value) || HOST_WITH_PORT.test(value)) {
    candidate = `https://${value}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { ok: false, error: 'That doesn’t look like a valid link.' };
  }
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return { ok: false, error: REJECTED };
  }

  if (parsed.protocol === 'mailto:') {
    const address = decodeURIComponent(parsed.pathname);
    if (!EMAIL.test(address)) {
      return { ok: false, error: 'That email address doesn’t look right.' };
    }
    return { ok: true, url: parsed.href };
  }

  // Refuse look-alike credentials such as https://bank.com@evil.example.
  if (parsed.username || parsed.password) {
    return { ok: false, error: 'Links can’t include a username or password.' };
  }
  if (!parsed.hostname.includes('.') || parsed.hostname.endsWith('.')) {
    return { ok: false, error: 'That doesn’t look like a valid web address.' };
  }
  return { ok: true, url: parsed.href };
}

/** Re-checks a stored URL at the moment of redirecting. */
export function isSafeRedirect(url: string): boolean {
  const result = checkUrl(url);
  return result.ok;
}
