import type { FontId } from '~/linkleaf.config';
import outfit from '@fontsource-variable/outfit/files/outfit-latin-wght-normal.woff2?url';
import fraunces from '@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2?url';
import spaceGrotesk from '@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2?url';
import bricolage from '@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2?url';
import nunito from '@fontsource-variable/nunito/files/nunito-latin-wght-normal.woff2?url';
import playfair from '@fontsource-variable/playfair-display/files/playfair-display-latin-wght-normal.woff2?url';
import jetbrains from '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2?url';
import caveat from '@fontsource-variable/caveat/files/caveat-latin-wght-normal.woff2?url';

const LATIN_FILES: Record<FontId, string> = {
  outfit,
  fraunces,
  'space-grotesk': spaceGrotesk,
  bricolage,
  nunito,
  playfair,
  'jetbrains-mono': jetbrains,
  caveat
};

/** Head link so a page's own font is ready at first paint. */
export const fontPreload = (font: FontId) => ({
  rel: 'preload',
  as: 'font',
  type: 'font/woff2',
  href: LATIN_FILES[font],
  crossOrigin: 'anonymous' as const
});
