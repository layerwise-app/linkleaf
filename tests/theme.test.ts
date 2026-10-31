import { describe, expect, it } from 'vitest';
import { config } from '~/linkleaf.config';
import type { ButtonFill, ButtonShape } from '~/linkleaf.config';
import {
  contrast,
  defaultThemeSettings,
  MIN_TEXT_CONTRAST,
  mix,
  readableOn,
  resolveTheme
} from '~/lib/theme';
import type { ResolvedTheme, ThemeSettings } from '~/lib/theme';

const FILLS: ButtonFill[] = ['filled', 'soft', 'outline', 'shadow'];
const SHAPES: ButtonShape[] = ['pill', 'rounded', 'square'];

/** Checks every text and background pair a visitor can see on the page. */
function expectReadable(theme: ResolvedTheme, context: string) {
  for (const stop of theme.stops) {
    expect(contrast(theme.text, stop), `${context}: text`).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    expect(contrast(theme.muted, stop), `${context}: muted`).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  }
  for (const surface of theme.buttonSurfaces) {
    expect(contrast(theme.button.color, surface), `${context}: button`).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  }
}

/** Small, seeded generator so a failure is reproducible. */
function randomColors(seed: number, count: number) {
  let state = seed;
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state;
  };
  return Array.from({ length: count }, () =>
    `#${(next() & 0xffffff).toString(16).padStart(6, '0')}`.toUpperCase()
  );
}

describe('contrast', () => {
  it('matches the WCAG reference values', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
    expect(contrast('#777777', '#FFFFFF')).toBeCloseTo(4.48, 1);
  });

  it('always finds readable text, even on the hardest mid-gray', () => {
    for (const color of ['#767676', '#777777', '#7F7F7F', '#808080', '#959595']) {
      expect(contrast(readableOn(color), color)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    }
  });
});

describe('presets', () => {
  it('offers at least six themes with unique ids', () => {
    expect(config.themes.length).toBeGreaterThanOrEqual(6);
    expect(new Set(config.themes.map((t) => t.id)).size).toBe(config.themes.length);
  });

  it.each(config.themes.map((t) => t.id))('%s is readable with every button style', (id) => {
    for (const buttonFill of FILLS) {
      for (const buttonShape of SHAPES) {
        const theme = resolveTheme({ ...defaultThemeSettings(id), buttonFill, buttonShape });
        expectReadable(theme, `${id}/${buttonFill}/${buttonShape}`);
        expect(theme.adjusted, `${id} shouldn't need adjusting`).toBe(false);
      }
    }
  });

  it.each(config.themes.map((t) => t.id))('%s stays readable over its decorative pattern', (id) => {
    const theme = resolveTheme(defaultThemeSettings(id));
    if (theme.pattern === 'none') return;
    // Patterns draw the text color at up to 12% over the background.
    for (const stop of theme.stops) {
      expect(contrast(theme.text, mix(stop, theme.text, 0.12))).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    }
  });
});

describe('custom choices', () => {
  const colors = randomColors(42, 60);

  it('keeps any accent readable on any preset', () => {
    for (const preset of config.themes) {
      for (const accent of colors) {
        for (const buttonFill of FILLS) {
          const theme = resolveTheme({ ...defaultThemeSettings(preset.id), accent, buttonFill });
          expectReadable(theme, `${preset.id} accent ${accent} ${buttonFill}`);
        }
      }
    }
  });

  it('keeps any solid background readable', () => {
    for (const color of colors) {
      for (const buttonFill of FILLS) {
        const settings: ThemeSettings = {
          ...defaultThemeSettings(),
          background: { type: 'solid', color },
          buttonFill
        };
        expectReadable(resolveTheme(settings), `solid ${color} ${buttonFill}`);
      }
    }
  });

  it('keeps any gradient readable, including black to white', () => {
    const pairs: [string, string][] = [
      ['#000000', '#FFFFFF'],
      ['#FFFFFF', '#000000'],
      ['#FF0000', '#00FFFF'],
      ['#808080', '#808080'],
      ...colors.slice(0, 30).map((from, i): [string, string] => [from, colors[i + 30]])
    ];
    for (const [from, to] of pairs) {
      for (const buttonFill of FILLS) {
        const settings: ThemeSettings = {
          ...defaultThemeSettings(),
          background: { type: 'gradient', from, to },
          buttonFill
        };
        expectReadable(resolveTheme(settings), `gradient ${from}-${to} ${buttonFill}`);
      }
    }
  });

  it('says when it changed someone’s colors', () => {
    const theme = resolveTheme({
      ...defaultThemeSettings(),
      background: { type: 'gradient', from: '#000000', to: '#FFFFFF' }
    });
    expect(theme.adjusted).toBe(true);
  });

  it('draws a border when the accent matches the background', () => {
    const theme = resolveTheme({
      ...defaultThemeSettings(),
      background: { type: 'solid', color: '#FFFFFF' },
      accent: '#FFFFFF',
      buttonFill: 'filled'
    });
    expect(theme.button.border).toBe(theme.text);
  });
});
