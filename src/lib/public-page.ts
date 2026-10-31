import type { SocialDoc } from '~/lib/page-schema';
import type { ThemeSettings } from '~/lib/theme';

/** What a visitor's browser receives. Hidden and scheduled links never appear. */
export type PublicPage = {
  username: string;
  displayName: string;
  bio: string;
  /** A ready-to-use image address, or null for a monogram. */
  avatar: string | null;
  socials: SocialDoc[];
  /** No destination URLs: visitors reach them through the `/go/` redirect. */
  links: { id: string; title: string }[];
  theme: ThemeSettings;
  showCreateYourOwn: boolean;
  isExample: boolean;
  /** Changes when the share image would change, to refresh link previews. */
  shareVersion: string;
};

/** Turns a stored avatar value into an address an `<img>` can use. */
export function avatarSrc(avatar: string | null): string | null {
  if (!avatar) return null;
  if (avatar.startsWith('/') || avatar.startsWith('data:image/')) return avatar;
  return `/media/${avatar}`;
}
