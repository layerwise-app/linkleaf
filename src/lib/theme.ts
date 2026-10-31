import { config } from '~/linkleaf.config';
import type {
  BackgroundSetting,
  ButtonFill,
  ButtonShape,
  FontId,
  ThemePattern,
  ThemePreset
} from '~/linkleaf.config';

export const MIN_TEXT_CONTRAST = 4.5;
export const MIN_UI_CONTRAST = 3;

/** What an owner chose. `null` means "use the preset's value". */
export type ThemeSettings = {
  preset: string;
  accent: string | null;
  background: BackgroundSetting | null;
  buttonFill: ButtonFill | null;
  buttonShape: ButtonShape | null;
  font: FontId | null;
};

export const defaultThemeSettings = (preset: string = config.themes[0].id): ThemeSettings => ({
  preset,
  accent: null,
  background: null,
  buttonFill: null,
  buttonShape: null,
  font: null
});

type Rgb = [number, number, number];

export const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function toRgb(hex: string): Rgb {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16)
  ];
}

function toHex([r, g, b]: Rgb): string {
  return `#${[r, g, b]
    .map((c) => Math.round(c).toString(16).padStart(2, '0'))
    .join('')}`.toUpperCase();
}

/** `amount` of `b` over `a`, in sRGB like the browser's gradients and alpha. */
export function mix(a: string, b: string, amount: number): string {
  const ca = toRgb(a);
  const cb = toRgb(b);
  return toHex([
    ca[0] + (cb[0] - ca[0]) * amount,
    ca[1] + (cb[1] - ca[1]) * amount,
    ca[2] + (cb[2] - ca[2]) * amount
  ]);
}

function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2 contrast ratio, from 1 to 21. */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const worstContrast = (color: string, stops: string[]) =>
  Math.min(...stops.map((stop) => contrast(color, stop)));

/** Colors along the background, sampled because gradients can dip between ends. */
function backgroundStops(background: BackgroundSetting): string[] {
  if (background.type === 'solid') return [background.color];
  return Array.from({ length: 9 }, (_, i) =>
    mix(background.from, background.to, i / 8)
  );
}

/** A readable color for text on `background`. Black or white always clears 4.5:1. */
export function readableOn(background: string, preferred?: string): string {
  if (preferred && contrast(preferred, background) >= MIN_TEXT_CONTRAST) {
    return preferred;
  }
  const best = ['#FFFFFF', '#111111', '#000000']
    .map((color) => ({ color, ratio: contrast(color, background) }))
    .filter(({ ratio }) => ratio >= MIN_TEXT_CONTRAST)[0];
  return best?.color ?? '#000000';
}

/**
 * Nudges a background that no text color can sit on, such as black fading to
 * white, until white or near-black text reads everywhere on it.
 */
function fitBackgroundToText(
  background: BackgroundSetting,
  preferredText: string
): { background: BackgroundSetting; text: string; adjusted: boolean } {
  const stops = backgroundStops(background);
  if (worstContrast(preferredText, stops) >= MIN_TEXT_CONTRAST) {
    return { background, text: preferredText, adjusted: false };
  }
  const candidates = ['#FFFFFF', '#111111'].sort(
    (a, b) => worstContrast(b, stops) - worstContrast(a, stops)
  );
  const text = candidates[0];
  if (worstContrast(text, stops) >= MIN_TEXT_CONTRAST) {
    return { background, text, adjusted: false };
  }

  // Move failing stops away from the text color, a little at a time.
  const away = text === '#FFFFFF' ? '#000000' : '#FFFFFF';
  let next: BackgroundSetting = background;
  for (let i = 0; i < 40; i++) {
    if (worstContrast(text, backgroundStops(next)) >= MIN_TEXT_CONTRAST) break;
    if (next.type === 'solid') {
      next = { type: 'solid', color: mix(next.color, away, 0.06) };
      continue;
    }
    // The middle of a gradient can fail when both ends pass, so if no end is
    // to blame, move both.
    const fromFails = contrast(text, next.from) < MIN_TEXT_CONTRAST;
    const toFails = contrast(text, next.to) < MIN_TEXT_CONTRAST;
    const moveBoth = !fromFails && !toFails;
    next = {
      type: 'gradient',
      from: fromFails || moveBoth ? mix(next.from, away, 0.06) : next.from,
      to: toFails || moveBoth ? mix(next.to, away, 0.06) : next.to
    };
  }
  return { background: next, text, adjusted: true };
}

/** `color`, moved toward `toward` only as far as it takes to stay readable. */
function fitOnBackground(color: string, toward: string, stops: string[]): string {
  for (let amount = 0; amount <= 1; amount += 0.1) {
    const candidate = mix(color, toward, amount);
    if (worstContrast(candidate, stops) >= MIN_TEXT_CONTRAST) return candidate;
  }
  return toward;
}

export type ResolvedTheme = {
  /** CSS custom properties consumed by `.ll-page`. */
  vars: Record<string, string>;
  background: BackgroundSetting;
  /** The sampled background colors the checks ran against. */
  stops: string[];
  /** For the browser chrome (`theme-color`). */
  themeColor: string;
  text: string;
  muted: string;
  accent: string;
  button: { background: string; color: string; border: string };
  /** The opaque button colors over each background stop. */
  buttonSurfaces: string[];
  buttonFill: ButtonFill;
  buttonShape: ButtonShape;
  font: FontId;
  pattern: ThemePattern;
  /** True when a custom choice was changed to keep the page readable. */
  adjusted: boolean;
};

const RADII: Record<ButtonShape, string> = {
  pill: '999px',
  rounded: '14px',
  square: '4px'
};

export function getPreset(id: string): ThemePreset {
  return config.themes.find((theme) => theme.id === id) ?? config.themes[0];
}

/**
 * Turns theme settings into final colors. This is the only place page colors
 * are computed, so every preset and custom combination gets the same contrast
 * guarantee: 4.5:1 for text, on every part of the background.
 */
export function resolveTheme(settings: ThemeSettings): ResolvedTheme {
  const preset = getPreset(settings.preset);
  const fitted = fitBackgroundToText(
    settings.background ?? preset.background,
    preset.text
  );
  const background = fitted.background;
  const stops = backgroundStops(background);
  const text = fitted.text;
  const middle = stops[Math.floor(stops.length / 2)];
  const accentChoice = settings.accent ?? preset.accent;
  const buttonFill = settings.buttonFill ?? preset.buttonFill;
  const buttonShape = settings.buttonShape ?? preset.buttonShape;
  const font = settings.font ?? preset.font;
  const pattern = settings.background ? 'none' : preset.pattern;

  let muted = text;
  for (const amount of [0.3, 0.2, 0.1]) {
    const candidate = mix(text, middle, amount);
    if (worstContrast(candidate, stops) >= MIN_TEXT_CONTRAST) {
      muted = candidate;
      break;
    }
  }

  // The accent as a text or outline color, for when it sits on the background.
  const accent = fitOnBackground(accentChoice, text, stops);

  let button: ResolvedTheme['button'];
  let buttonSurfaces: string[];
  let adjusted = fitted.adjusted;
  let shadow = 'none';

  if (buttonFill === 'outline') {
    button = { background: 'transparent', color: accent, border: accent };
    buttonSurfaces = stops;
    if (settings.accent && accent !== settings.accent) adjusted = true;
  } else if (buttonFill === 'soft') {
    // A wash of the text color, thinned until text still reads on top of it.
    const alpha =
      [0.14, 0.1, 0.06, 0.03].find((a) =>
        stops.every(
          (stop) => contrast(text, mix(stop, text, a)) >= MIN_TEXT_CONTRAST
        )
      ) ?? 0;
    button = {
      background: `color-mix(in srgb, ${text} ${alpha * 100}%, transparent)`,
      color: text,
      border: `color-mix(in srgb, ${text} ${Math.max(alpha * 100, 24)}%, transparent)`
    };
    buttonSurfaces = stops.map((stop) => mix(stop, text, alpha));
  } else {
    // Filled and shadow buttons sit on the accent itself. Keep a border when
    // the accent is too close to the background to show the button's edge.
    const color = readableOn(accentChoice);
    const edgeVisible = worstContrast(accentChoice, stops) >= MIN_UI_CONTRAST;
    button = {
      background: accentChoice,
      color,
      border:
        buttonFill === 'shadow' || !edgeVisible ? text : accentChoice
    };
    buttonSurfaces = [accentChoice];
    if (buttonFill === 'shadow') shadow = `4px 4px 0 ${text}`;
  }

  const backgroundCss =
    background.type === 'solid'
      ? background.color
      : `linear-gradient(165deg, ${background.from}, ${background.to})`;

  return {
    vars: {
      '--ll-bg': backgroundCss,
      '--ll-bg-color': middle,
      '--ll-text': text,
      '--ll-muted': muted,
      '--ll-accent': accent,
      '--ll-btn-bg': button.background,
      '--ll-btn-fg': button.color,
      '--ll-btn-border': button.border,
      '--ll-btn-shadow': shadow,
      '--ll-radius': RADII[buttonShape],
      '--ll-font': config.fonts[font].family,
      // The monogram avatar sits on the accent, like a filled button.
      '--ll-avatar-bg': accentChoice,
      '--ll-avatar-fg': readableOn(accentChoice)
    },
    background,
    stops,
    themeColor: background.type === 'solid' ? background.color : background.from,
    text,
    muted,
    accent,
    button,
    buttonSurfaces,
    buttonFill,
    buttonShape,
    font,
    pattern,
    adjusted
  };
}
