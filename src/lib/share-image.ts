import { config } from '~/linkleaf.config';
import { resolveTheme } from '~/lib/theme';
import type { ThemeSettings } from '~/lib/theme';

type ShareInput = {
  displayName: string;
  bio: string;
  avatar: string | null;
  theme: ThemeSettings;
  titles: string[];
};

/** A short fingerprint of everything drawn on the share image. */
export function shareVersion(input: ShareInput): string {
  const text = JSON.stringify([
    input.displayName,
    input.bio,
    input.avatar,
    input.theme,
    input.titles.slice(0, 3)
  ]);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

const escapeXml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

// The embedded fonts cover Latin text. Other scripts fall back to the username,
// which is always ASCII, rather than rendering empty boxes.
const drawable = (value: string) =>
  /^[\u0020-\u007e\u00a0-\u00ff\u0131\u0152\u0153\u2010-\u2027\u2030-\u205e]*$/.test(value);

function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const lines: string[] = [];
  let current = '';
  const words = text.split(/\s+/).filter(Boolean);
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = word.length > maxChars ? `${word.slice(0, maxChars - 1)}…` : word;
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && current) lines.push(current);
  const usedAll = lines.join(' ').length >= text.replace(/\s+/g, ' ').trim().length;
  if (lines.length === maxLines && !usedAll) {
    const last = lines[maxLines - 1];
    lines[maxLines - 1] = `${last.slice(0, maxChars - 1).trimEnd()}…`;
  }
  return lines;
}

// Family names inside `src/assets/og/`, as resvg matches them.
const SERIF = 'Fraunces SemiBold';
const SANS = 'Outfit Medium';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase();

/**
 * Draws a page's 1200×630 link preview as SVG, in that page's own theme: avatar,
 * name, bio, and its first links as real buttons.
 */
export function buildShareSvg({
  username,
  displayName,
  bio,
  titles,
  theme,
  avatarDataUrl,
  host
}: {
  username: string;
  displayName: string;
  bio: string;
  titles: string[];
  theme: ThemeSettings;
  avatarDataUrl: string | null;
  host: string;
}): string {
  const resolved = resolveTheme(theme);
  const family =
    config.fonts[resolved.font].kind === 'serif' ? SERIF : SANS;
  const shown = titles.filter(drawable).slice(0, 3);
  const hasButtons = shown.length > 0;
  const name = drawable(displayName) ? displayName : `@${username}`;
  const about = drawable(bio) ? bio : '';
  const columnChars = hasButtons ? 24 : 40;

  const nameSize = name.length <= columnChars * 0.6 ? 76 : name.length <= columnChars ? 60 : 48;
  const nameLines = wrap(name, Math.floor((columnChars * 76) / nameSize), 2);
  const bioLines = wrap(about, hasButtons ? 38 : 66, hasButtons ? 3 : 2);

  const { background, text, muted, accent, buttonFill, buttonShape } = resolved;
  const fill =
    background.type === 'solid'
      ? background.color
      : 'url(#background)';
  const radius = { pill: 40, rounded: 18, square: 6 }[buttonShape];

  const avatarY = 72;
  const avatarSize = 184;
  let y = avatarY + avatarSize + 40;
  const name_ = nameLines
    .map((line, index) => {
      const baseline = y + nameSize * (index + 0.85);
      return `<text x="80" y="${baseline}" font-family="${family}" font-size="${nameSize}" font-weight="600" fill="${text}">${escapeXml(line)}</text>`;
    })
    .join('');
  y += nameLines.length * nameSize + 14;
  const bio_ = bioLines
    .map(
      (line, index) =>
        `<text x="80" y="${y + 30 * (index + 1) + index * 8}" font-family="${SANS}" font-size="30" fill="${muted}">${escapeXml(line)}</text>`
    )
    .join('');

  const buttonWidth = 400;
  const buttonHeight = 88;
  const gap = 24;
  const buttonX = 1200 - 72 - buttonWidth;
  const buttonsTop = (630 - (shown.length * buttonHeight + (shown.length - 1) * gap)) / 2;
  const buttons = shown
    .map((title, index) => {
      const top = buttonsTop + index * (buttonHeight + gap);
      let shape: string;
      let color: string;
      if (buttonFill === 'outline') {
        shape = `fill="none" stroke="${accent}" stroke-width="3"`;
        color = accent;
      } else if (buttonFill === 'soft') {
        shape = `fill="${text}" fill-opacity="0.12" stroke="${text}" stroke-opacity="0.25" stroke-width="2"`;
        color = text;
      } else {
        shape = `fill="${resolved.button.background}" stroke="${resolved.button.border}" stroke-width="3"`;
        color = resolved.button.color;
      }
      const shadow =
        buttonFill === 'shadow'
          ? `<rect x="${buttonX + 7}" y="${top + 7}" width="${buttonWidth}" height="${buttonHeight}" rx="${radius}" fill="${text}"/>`
          : '';
      const fontSize = title.length > 22 ? 23 : 28;
      const label = title.length > 30 ? `${title.slice(0, 29).trimEnd()}…` : title;
      return `${shadow}<rect x="${buttonX}" y="${top}" width="${buttonWidth}" height="${buttonHeight}" rx="${radius}" ${shape}/><text x="${buttonX + buttonWidth / 2}" y="${top + buttonHeight / 2 + 10}" text-anchor="middle" font-family="${family}" font-size="${fontSize}" font-weight="600" fill="${color}">${escapeXml(label)}</text>`;
    })
    .join('');

  const center = 80 + avatarSize / 2;
  const middle = avatarY + avatarSize / 2;
  const avatar = avatarDataUrl
    ? `<circle cx="${center}" cy="${middle}" r="${avatarSize / 2 + 5}" fill="${text}" fill-opacity="0.18"/><image href="${escapeXml(avatarDataUrl)}" x="80" y="${avatarY}" width="${avatarSize}" height="${avatarSize}" preserveAspectRatio="xMidYMid slice" clip-path="url(#avatar)"/>`
    : `<circle cx="${center}" cy="${middle}" r="${avatarSize / 2}" fill="${resolved.vars['--ll-avatar-bg']}"/><text x="${center}" y="${middle + 28}" text-anchor="middle" font-family="${family}" font-size="80" font-weight="600" fill="${resolved.vars['--ll-avatar-fg']}">${escapeXml(drawable(displayName) ? initials(displayName) : username.slice(0, 2).toUpperCase())}</text>`;

  const gradient =
    background.type === 'gradient'
      ? `<linearGradient id="background" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="${background.from}"/><stop offset="1" stop-color="${background.to}"/></linearGradient>`
      : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><defs>${gradient}<clipPath id="avatar"><circle cx="${center}" cy="${middle}" r="${avatarSize / 2}"/></clipPath></defs><rect width="1200" height="630" fill="${fill}"/>${avatar}${name_}${bio_}${buttons}<text x="80" y="582" font-family="${SANS}" font-size="26" font-weight="500" fill="${muted}">${escapeXml(`${host}/${username}`)}</text></svg>`;
}

