/**
 * Works out where a visitor came from, stored as a short slug with no URL, path,
 * or query string. In-app browsers usually send no referrer, so their user agent
 * is the better signal for the traffic this product cares about most.
 */

const IN_APP_AGENTS: [RegExp, string][] = [
  [/\bInstagram\b/i, 'instagram'],
  [/musical_ly|BytedanceWebview|TikTok|trill_/i, 'tiktok'],
  [/\bThreads\b|Barcelona/i, 'threads'],
  [/FBAN|FBAV|FB_IAB|FBIOS/i, 'facebook'],
  [/Snapchat/i, 'snapchat'],
  [/LinkedInApp/i, 'linkedin'],
  [/Twitter(?:Android)?\b/i, 'x'],
  [/Pinterest/i, 'pinterest'],
  [/Reddit/i, 'reddit'],
  [/\bLine\//i, 'line']
];

const REFERRER_HOSTS: [RegExp, string][] = [
  [/(^|\.)instagram\.com$|^com\.instagram\.android$/, 'instagram'],
  [/(^|\.)tiktok\.com$|^com\.zhiliaoapp\.musically$|^com\.ss\.android\.ugc\.trill$/, 'tiktok'],
  [/(^|\.)threads\.(net|com)$|^com\.instagram\.barcelona$/, 'threads'],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me)$|^com\.facebook\.katana$/, 'facebook'],
  [/(^|\.)(x\.com|twitter\.com)$|^t\.co$|^com\.twitter\.android$/, 'x'],
  [/(^|\.)(youtube\.com|youtu\.be)$|^com\.google\.android\.youtube$/, 'youtube'],
  [/(^|\.)linkedin\.com$|^lnkd\.in$|^com\.linkedin\.android$/, 'linkedin'],
  [/(^|\.)snapchat\.com$/, 'snapchat'],
  [/(^|\.)pinterest\.[a-z.]+$|^pin\.it$/, 'pinterest'],
  [/(^|\.)reddit\.com$/, 'reddit'],
  [/(^|\.)google\.[a-z.]+$|^com\.google\.android\.googlequicksearchbox$/, 'google'],
  [/(^|\.)bing\.com$/, 'bing'],
  [/(^|\.)duckduckgo\.com$/, 'duckduckgo']
];

const LABELS: Record<string, string> = {
  bing: 'Bing',
  direct: 'Direct',
  duckduckgo: 'DuckDuckGo',
  email: 'Email',
  facebook: 'Facebook',
  google: 'Google',
  instagram: 'Instagram',
  line: 'LINE',
  linkedin: 'LinkedIn',
  pinterest: 'Pinterest',
  reddit: 'Reddit',
  snapchat: 'Snapchat',
  threads: 'Threads',
  tiktok: 'TikTok',
  x: 'X',
  youtube: 'YouTube'
};

const SLUG = /^[a-z0-9][a-z0-9.-]{0,63}$/;

/** Makes a client-supplied value safe to store, or null when it isn't. */
export function cleanSource(value: string | null | undefined): string | null {
  const slug = value?.trim().toLowerCase();
  return slug && SLUG.test(slug) ? slug : null;
}

function hostFromReferrer(referrer: string): string | null {
  try {
    return new URL(referrer).hostname.toLowerCase().replace(/^www\./, '') || null;
  } catch {
    return null;
  }
}

export function classifySource({
  referrer,
  userAgent,
  utmSource,
  ownHost
}: {
  referrer?: string | null;
  userAgent?: string | null;
  utmSource?: string | null;
  /** Visits from this app's own pages aren't an outside source. */
  ownHost?: string | null;
}): string {
  // An explicit tag wins: people put it on the link in their own bio.
  const tagged = cleanSource(utmSource);
  if (tagged) {
    const fromTag = REFERRER_HOSTS.find(([pattern]) => pattern.test(tagged));
    return fromTag ? fromTag[1] : tagged;
  }

  const agent = userAgent ?? '';
  for (const [pattern, source] of IN_APP_AGENTS) {
    if (pattern.test(agent)) return source;
  }

  const host = referrer ? hostFromReferrer(referrer) : null;
  if (!host || host === ownHost?.replace(/^www\./, '')) return 'direct';
  for (const [pattern, source] of REFERRER_HOSTS) {
    if (pattern.test(host)) return source;
  }
  return cleanSource(host) ?? 'direct';
}

export const sourceLabel = (source: string) => LABELS[source] ?? source;

const BOT_AGENT =
  /bot\b|bot\/|crawl|spider|slurp|facebookexternalhit|facebot|meta-externalagent|whatsapp\/|preview|headless|lighthouse|embedly|vkshare|pingdom|curl\/|wget\/|python-requests|httpclient|go-http-client/i;

/** Crawlers and link-preview fetchers, which shouldn't count as people. */
export function isBot(userAgent: string | null | undefined): boolean {
  return !userAgent || BOT_AGENT.test(userAgent);
}
