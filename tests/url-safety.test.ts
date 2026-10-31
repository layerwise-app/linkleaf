import { describe, expect, it } from 'vitest';
import { checkUrl, isSafeRedirect } from '~/lib/url-safety';

describe('checkUrl', () => {
  it.each([
    ['https://example.com/a?b=c#d', 'https://example.com/a?b=c#d'],
    ['http://example.com', 'http://example.com/'],
    ['HTTPS://EXAMPLE.COM', 'https://example.com/'],
    ['example.com', 'https://example.com/'],
    ['www.example.com/shop', 'https://www.example.com/shop'],
    ['example.com:8080/shop', 'https://example.com:8080/shop'],
    ['  https://example.com  ', 'https://example.com/'],
    ['mailto:me@example.com', 'mailto:me@example.com'],
    ['mailto:me@example.com?subject=Hi', 'mailto:me@example.com?subject=Hi'],
    ['me@example.com', 'mailto:me@example.com']
  ])('accepts %s', (input, expected) => {
    expect(checkUrl(input)).toEqual({ ok: true, url: expected });
  });

  it.each([
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    ' javascript:alert(1)',
    'java\nscript:alert(1)',
    'java\tscript:alert(1)',
    '\u0001javascript:alert(1)',
    'jAvAsCrIpT:alert(document.cookie)',
    'javascript://example.com/%0aalert(1)',
    'javascript:1',
    'data:text/html,<script>alert(1)</script>',
    'DATA:text/html;base64,PHNjcmlwdD4=',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    'ftp://example.com/file',
    'blob:https://example.com/id',
    'about:blank',
    'tel:+15551234567',
    'sms:+15551234567',
    'https://bank.example.com@evil.example/',
    'https://user:pass@example.com/',
    'https://localhost/',
    'http://[::1]/',
    'https:\\\\example.com',
    'mailto:not-an-email',
    '',
    '   '
  ])('rejects %j', (input) => {
    expect(checkUrl(input).ok).toBe(false);
  });

  it('rejects absurdly long links', () => {
    expect(checkUrl(`https://example.com/${'a'.repeat(3000)}`).ok).toBe(false);
  });

  it('checks stored URLs again at redirect time', () => {
    expect(isSafeRedirect('https://example.com/')).toBe(true);
    expect(isSafeRedirect('javascript:alert(1)')).toBe(false);
  });
});
