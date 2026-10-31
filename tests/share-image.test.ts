import { describe, expect, it } from 'vitest';
import { buildShareSvg, shareVersion } from '~/lib/share-image';
import { defaultThemeSettings } from '~/lib/theme';

const base = {
  username: 'maya',
  displayName: 'Maya <b>Rae</b> & Co',
  bio: 'Line one "quoted" and a long tail of words that keeps on going and going and going and going and going past the limit of the card.',
  titles: ['First', 'Second', 'Third', 'Fourth'],
  theme: defaultThemeSettings(),
  avatarDataUrl: null,
  host: 'example.com'
};

describe('buildShareSvg', () => {
  it('escapes user text so it can’t break out of the SVG', () => {
    const svg = buildShareSvg(base);
    expect(svg).not.toContain('<b>');
    expect(svg).toContain('&lt;b&gt;');
    expect(svg).toContain('&amp;');
  });

  it('draws at most three buttons', () => {
    const svg = buildShareSvg(base);
    expect(svg).toContain('First');
    expect(svg).toContain('Third');
    expect(svg).not.toContain('Fourth');
  });

  it('falls back to the username for names the fonts can’t draw', () => {
    const svg = buildShareSvg({ ...base, displayName: '김민지', bio: '안녕하세요', titles: ['링크'] });
    expect(svg).toContain('@maya');
    expect(svg).not.toContain('김민지');
    expect(svg).not.toContain('안녕');
    expect(svg).not.toContain('링크');
  });

  it('works for every button style without CSS functions resvg can’t read', () => {
    for (const buttonFill of ['filled', 'soft', 'outline', 'shadow'] as const) {
      const svg = buildShareSvg({ ...base, theme: { ...defaultThemeSettings(), buttonFill } });
      expect(svg).not.toContain('color-mix');
    }
  });
});

describe('shareVersion', () => {
  const input = {
    displayName: 'A',
    bio: 'B',
    avatar: null,
    theme: defaultThemeSettings(),
    titles: ['One']
  };
  it('is stable for the same content', () => {
    expect(shareVersion(input)).toBe(shareVersion({ ...input }));
  });
  it('changes when anything drawn changes', () => {
    expect(shareVersion(input)).not.toBe(shareVersion({ ...input, bio: 'C' }));
    expect(shareVersion(input)).not.toBe(shareVersion({ ...input, avatar: 'x' }));
    expect(shareVersion(input)).not.toBe(shareVersion({ ...input, titles: ['Two'] }));
    expect(shareVersion(input)).not.toBe(
      shareVersion({ ...input, theme: defaultThemeSettings('terminal') })
    );
  });
});
