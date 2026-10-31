import { describe, expect, it } from 'vitest';
import { pageDocSchema } from '~/lib/page-schema';
import { sampleDraft } from '~/lib/draft';
import { sniffImageType } from '~/lib/image-sniff';

const validDoc = () => structuredClone(sampleDraft().doc);

describe('pageDocSchema', () => {
  it('accepts the Try mode sample', () => {
    expect(pageDocSchema.safeParse(validDoc()).success).toBe(true);
  });

  it.each(['javascript:alert(1)', 'data:text/html,x', 'JAVASCRIPT:alert(1)', 'java\nscript:alert(1)'])(
    'rejects %j in links and socials',
    (url) => {
      const link = validDoc();
      link.links[0].url = url;
      expect(pageDocSchema.safeParse(link).success).toBe(false);
      const social = validDoc();
      social.socials[0].url = url;
      expect(pageDocSchema.safeParse(social).success).toBe(false);
    }
  );

  it('normalizes bare domains on the way in', () => {
    const doc = validDoc();
    doc.links[0].url = 'example.com/shop';
    expect(pageDocSchema.parse(doc).links[0].url).toBe('https://example.com/shop');
  });

  it('rejects an end date before the start', () => {
    const doc = validDoc();
    doc.links[0].startsAt = 2000;
    doc.links[0].endsAt = 1000;
    expect(pageDocSchema.safeParse(doc).success).toBe(false);
  });

  it('rejects colors that could inject CSS', () => {
    const doc = validDoc();
    doc.theme.accent = 'red;background:url(https://evil.example/x)';
    expect(pageDocSchema.safeParse(doc).success).toBe(false);
  });

  it('rejects unknown themes and over-limit lists', () => {
    const doc = validDoc();
    doc.theme.preset = 'nope';
    expect(pageDocSchema.safeParse(doc).success).toBe(false);
    const many = validDoc();
    many.links = Array.from({ length: 51 }, (_, i) => ({
      ...many.links[0],
      id: `link-number-${i}`
    }));
    expect(pageDocSchema.safeParse(many).success).toBe(false);
  });

  it('ignores fields it doesn’t know, like someone else’s avatar key', () => {
    const doc = { ...validDoc(), avatar: 'avatars/other/x.jpg', userId: 'victim' };
    const parsed = pageDocSchema.parse(doc);
    expect(parsed).not.toHaveProperty('avatar');
    expect(parsed).not.toHaveProperty('userId');
  });
});

describe('sniffImageType', () => {
  const bytes = (...values: number[]) => new Uint8Array(values);

  it('recognizes real image signatures', () => {
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('image/jpeg');
    expect(sniffImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe('image/png');
    expect(sniffImageType(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50))).toBe('image/webp');
  });

  it('refuses SVG, HTML, and anything else, whatever it claims to be', () => {
    expect(sniffImageType(new TextEncoder().encode('<svg onload="alert(1)">'))).toBeNull();
    expect(sniffImageType(new TextEncoder().encode('<html>'))).toBeNull();
    expect(sniffImageType(bytes(0x47, 0x49, 0x46, 0x38))).toBeNull(); // GIF
    expect(sniffImageType(bytes())).toBeNull();
  });
});
