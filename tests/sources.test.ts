import { describe, expect, it } from 'vitest';
import { classifySource, cleanSource, isBot, sourceLabel } from '~/lib/sources';

const CHROME = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130 Safari/537.36';
const INSTAGRAM = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Instagram 300.0.0';
const TIKTOK = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Mobile Safari/537.36 trill_2023 BytedanceWebview/d8a21c6';
const FACEBOOK = 'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Mobile/15E148 [FBAN/FBIOS;FBAV/430.0]';

describe('classifySource', () => {
  it('recognizes in-app browsers that send no referrer', () => {
    expect(classifySource({ userAgent: INSTAGRAM })).toBe('instagram');
    expect(classifySource({ userAgent: TIKTOK })).toBe('tiktok');
    expect(classifySource({ userAgent: FACEBOOK })).toBe('facebook');
  });

  it('reads referrers, including Android app referrers', () => {
    expect(classifySource({ referrer: 'https://l.instagram.com/?u=x', userAgent: CHROME })).toBe('instagram');
    expect(classifySource({ referrer: 'android-app://com.zhiliaoapp.musically/', userAgent: CHROME })).toBe('tiktok');
    expect(classifySource({ referrer: 'https://t.co/abc', userAgent: CHROME })).toBe('x');
    expect(classifySource({ referrer: 'https://www.google.com/search?q=secret', userAgent: CHROME })).toBe('google');
  });

  it('keeps only the host of other referrers, never the path or query', () => {
    expect(classifySource({ referrer: 'https://www.blog.example/post?token=abc', userAgent: CHROME })).toBe('blog.example');
  });

  it('prefers an explicit utm_source', () => {
    expect(classifySource({ utmSource: 'Newsletter', userAgent: INSTAGRAM })).toBe('newsletter');
  });

  it('treats no referrer and our own pages as direct', () => {
    expect(classifySource({ userAgent: CHROME })).toBe('direct');
    expect(classifySource({ referrer: 'https://linkleaf.example/maya', ownHost: 'linkleaf.example', userAgent: CHROME })).toBe('direct');
  });

  it('survives junk', () => {
    expect(classifySource({ referrer: 'not a url', userAgent: CHROME })).toBe('direct');
    expect(classifySource({ utmSource: '<script>', userAgent: CHROME })).toBe('direct');
  });
});

describe('helpers', () => {
  it('sanitizes source values from the browser', () => {
    expect(cleanSource('instagram')).toBe('instagram');
    expect(cleanSource('a'.repeat(65))).toBeNull();
    expect(cleanSource("'; DROP TABLE")).toBeNull();
    expect(cleanSource(null)).toBeNull();
  });

  it('labels sources for people', () => {
    expect(sourceLabel('tiktok')).toBe('TikTok');
    expect(sourceLabel('blog.example')).toBe('blog.example');
  });

  it('spots crawlers but not real in-app browsers', () => {
    expect(isBot('facebookexternalhit/1.1')).toBe(true);
    expect(isBot('Googlebot/2.1')).toBe(true);
    expect(isBot('WhatsApp/2.23')).toBe(true);
    expect(isBot(null)).toBe(true);
    expect(isBot(INSTAGRAM)).toBe(false);
    expect(isBot(TIKTOK)).toBe(false);
    expect(isBot(FACEBOOK)).toBe(false);
    expect(isBot(CHROME)).toBe(false);
  });
});
