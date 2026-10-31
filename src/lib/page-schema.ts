import { z } from 'zod';
import { config } from '~/linkleaf.config';
import { HEX_COLOR } from '~/lib/theme';
import type { ThemeSettings } from '~/lib/theme';
import { checkUrl } from '~/lib/url-safety';

const { limits } = config;

/** Runs on the server for every write. Rejects anything but http, https, mailto. */
const safeUrl = z.string().transform((value, ctx) => {
  const result = checkUrl(value);
  if (!result.ok) {
    ctx.addIssue({ code: 'custom', message: result.error });
    return z.NEVER;
  }
  return result.url;
});

const hexColor = z.string().regex(HEX_COLOR);

const background = z.discriminatedUnion('type', [
  z.object({ type: z.literal('solid'), color: hexColor }),
  z.object({ type: z.literal('gradient'), from: hexColor, to: hexColor })
]);

const themeIds = config.themes.map((theme) => theme.id) as [string, ...string[]];
const fontIds = Object.keys(config.fonts) as [keyof typeof config.fonts, ...(keyof typeof config.fonts)[]];

export const themeSchema: z.ZodType<ThemeSettings> = z.object({
  preset: z.enum(themeIds),
  accent: hexColor.nullable(),
  background: background.nullable(),
  buttonFill: z.enum(['filled', 'soft', 'outline', 'shadow']).nullable(),
  buttonShape: z.enum(['pill', 'rounded', 'square']).nullable(),
  font: z.enum(fontIds).nullable()
});

export const socialNetworks = [
  'instagram',
  'tiktok',
  'youtube',
  'x',
  'threads',
  'facebook',
  'linkedin',
  'github',
  'spotify',
  'soundcloud',
  'twitch',
  'discord',
  'pinterest',
  'snapchat',
  'bluesky',
  'substack',
  'patreon',
  'email',
  'website'
] as const;
export type SocialNetwork = (typeof socialNetworks)[number];

const socialSchema = z.object({
  network: z.enum(socialNetworks),
  url: safeUrl
});

const linkId = z.string().regex(/^[a-zA-Z0-9-]{8,64}$/, 'Invalid link ID');
const timestamp = z.number().int().min(0).max(8_640_000_000_000_000).nullable();

export const linkSchema = z
  .object({
    id: linkId,
    title: z
      .string()
      .trim()
      .min(1, 'Give this link a title.')
      .max(limits.linkTitleMax, `Keep titles to ${limits.linkTitleMax} characters.`),
    url: safeUrl,
    enabled: z.boolean(),
    startsAt: timestamp,
    endsAt: timestamp
  })
  .refine(
    (link) =>
      link.startsAt === null || link.endsAt === null || link.endsAt > link.startsAt,
    { message: 'The end date must be after the start date.', path: ['endsAt'] }
  );

/** The editable page. The username and avatar have their own server checks. */
export const pageDocSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'Add your name.')
    .max(limits.displayNameMax, `Keep your name to ${limits.displayNameMax} characters.`),
  bio: z
    .string()
    .trim()
    .max(limits.bioMax, `Keep your bio to ${limits.bioMax} characters.`),
  socials: z.array(socialSchema).max(limits.maxSocials, `Add up to ${limits.maxSocials} social links.`),
  links: z.array(linkSchema).max(limits.maxLinks, `Add up to ${limits.maxLinks} links.`),
  theme: themeSchema,
  showCreateYourOwn: z.boolean(),
  published: z.boolean()
});

export type LinkDoc = z.output<typeof linkSchema>;
export type SocialDoc = z.output<typeof socialSchema>;
export type PageDoc = z.output<typeof pageDocSchema>;

export const reportSchema = z.object({
  username: z.string().max(100),
  reason: z.enum(config.reportReasons.map((r) => r.id) as [string, ...string[]]),
  details: z.string().trim().max(limits.reportDetailsMax),
  contactEmail: z.union([z.literal(''), z.email().max(254)])
});

/** The first problem as a sentence, for error toasts. */
export const firstIssue = (error: z.ZodError) =>
  error.issues[0]?.message ?? 'Something in this page isn’t valid.';
