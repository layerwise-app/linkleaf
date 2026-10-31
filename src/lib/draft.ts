import { dayRange, clickThroughRate } from '~/lib/analytics';
import type { AnalyticsData, AnalyticsRange } from '~/lib/analytics';
import type { PageDoc } from '~/lib/page-schema';
import { defaultThemeSettings } from '~/lib/theme';

/**
 * Try mode's browser-only draft. It stays in localStorage until it has been
 * safely added to a real page, so signing up (by any route) can't lose it.
 */
export type Draft = {
  username: string;
  /** A small data URL from the browser; uploaded to Storage on sign-up. */
  avatar: string | null;
  doc: PageDoc;
};

const DRAFT_KEY = 'linkleaf:draft:v1';
const USERNAME_KEY = 'linkleaf:wanted-username';

export const SAMPLE_USERNAME = 'your-name';

export const sampleDraft = (): Draft => ({
  username: SAMPLE_USERNAME,
  avatar: null,
  doc: {
    displayName: 'Robin Ash',
    bio: 'Illustrator and part-time plant whisperer. This is sample data, so change anything you like.',
    socials: [
      { network: 'instagram', url: 'https://example.com/instagram' },
      { network: 'tiktok', url: 'https://example.com/tiktok' },
      { network: 'email', url: 'mailto:robin@example.com' }
    ],
    links: [
      {
        id: 'sample-link-1',
        title: 'Shop my prints',
        url: 'https://example.com/shop',
        enabled: true,
        startsAt: null,
        endsAt: null
      },
      {
        id: 'sample-link-2',
        title: 'Commission a portrait',
        url: 'https://example.com/commissions',
        enabled: true,
        startsAt: null,
        endsAt: null
      },
      {
        id: 'sample-link-3',
        title: 'Latest video: painting moss',
        url: 'https://example.com/video',
        enabled: true,
        startsAt: null,
        endsAt: null
      },
      {
        id: 'sample-link-4',
        title: 'Say hello',
        url: 'mailto:robin@example.com',
        enabled: true,
        startsAt: null,
        endsAt: null
      }
    ],
    theme: defaultThemeSettings('marmalade'),
    showCreateYourOwn: true,
    published: true
  }
});

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null; // Storage can be blocked in private modes and some in-app browsers.
  }
}

export function loadDraft(): Draft | null {
  const raw = read(DRAFT_KEY);
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw) as Draft;
    return draft?.doc?.theme ? draft : null;
  } catch {
    return null;
  }
}

/** Returns false when the browser refused to store it. */
export function saveDraft(draft: Draft): boolean {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function clearDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nothing to clear.
  }
}

export const loadWantedUsername = () => read(USERNAME_KEY);

export function saveWantedUsername(username: string) {
  try {
    window.localStorage.setItem(USERNAME_KEY, username);
  } catch {
    // The claim form just starts empty.
  }
}

export function clearWantedUsername() {
  try {
    window.localStorage.removeItem(USERNAME_KEY);
  } catch {
    // Nothing to clear.
  }
}

/** Turns a stored data URL back into a file for upload. */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

/** Made-up numbers for Try mode. Never stored and labeled as sample data. */
export function sampleAnalytics(days: AnalyticsRange, titles: string[]): AnalyticsData {
  const range = dayRange(days, Date.now());
  const daily = range.map((day, index) => {
    const wave = Math.sin(index * 1.3) * 0.25 + Math.sin(index * 0.5) * 0.2 + 1;
    const views = Math.round(120 * wave + index * 2);
    return { day, views, clicks: Math.round(views * (0.34 + Math.cos(index) * 0.05)) };
  });
  const views = daily.reduce((sum, row) => sum + row.views, 0);
  const clicks = daily.reduce((sum, row) => sum + row.clicks, 0);
  const shares = [0.42, 0.27, 0.18, 0.09, 0.04];
  return {
    days,
    totals: { views, clicks, ctr: clickThroughRate(views, clicks) },
    previous: {
      views: Math.round(views * 0.86),
      clicks: Math.round(clicks * 0.8),
      ctr: clickThroughRate(views * 0.86, clicks * 0.8)
    },
    daily,
    topLinks: titles.slice(0, 5).map((title, index) => ({
      id: String(index),
      title,
      clicks: Math.round(clicks * shares[index])
    })),
    topSources: [
      { source: 'instagram', views: Math.round(views * 0.46), clicks: Math.round(clicks * 0.52) },
      { source: 'tiktok', views: Math.round(views * 0.28), clicks: Math.round(clicks * 0.26) },
      { source: 'direct', views: Math.round(views * 0.14), clicks: Math.round(clicks * 0.12) },
      { source: 'youtube', views: Math.round(views * 0.08), clicks: Math.round(clicks * 0.07) },
      { source: 'google', views: Math.round(views * 0.04), clicks: Math.round(clicks * 0.03) }
    ]
  };
}
