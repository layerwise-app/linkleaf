/**
 * Make it yours: everything brand-specific lives here. Change the product name,
 * colors, themes, fonts, reserved usernames, and limits in this one file and
 * the landing page, editor, public pages, and share images all follow.
 */

export type ButtonFill = 'filled' | 'soft' | 'outline' | 'shadow';
export type ButtonShape = 'pill' | 'rounded' | 'square';
export type ThemePattern = 'none' | 'dots' | 'grid' | 'lines';

export type FontId =
  | 'outfit'
  | 'fraunces'
  | 'space-grotesk'
  | 'bricolage'
  | 'nunito'
  | 'playfair'
  | 'jetbrains-mono'
  | 'caveat';

export type BackgroundSetting =
  | { type: 'solid'; color: string }
  | { type: 'gradient'; from: string; to: string };

export type ThemePreset = {
  id: string;
  name: string;
  /** One short line shown under the name in the theme picker. */
  description: string;
  background: BackgroundSetting;
  text: string;
  accent: string;
  buttonFill: ButtonFill;
  buttonShape: ButtonShape;
  font: FontId;
  pattern: ThemePattern;
};

export const config = {
  name: 'Linkleaf',
  tagline: 'One link for everything you’re growing.',
  description:
    'Linkleaf gives you one beautiful page for all your links. Claim your name, pick a theme, and share it from Instagram, TikTok, or anywhere else.',
  /** Shown in the footer of the landing page. */
  footerNote: 'A link-in-bio template built with Layerwise.',

  /** App colors. Public pages use their own theme instead (see `themes`). */
  brand: {
    background: '#FBF9F1',
    foreground: '#12281F',
    card: '#FFFFFF',
    primary: '#14432F',
    primaryForeground: '#F6F3E8',
    highlight: '#C6F36B',
    highlightForeground: '#12281F',
    muted: '#EFEBDD',
    mutedForeground: '#526258',
    border: '#DFDACA',
    ring: '#1F7A4D',
    destructive: '#B3261E',
    /** Chart series in the analytics view: page views, then link clicks. */
    chartViews: '#1A73B5',
    chartClicks: '#E2632B'
  },

  /** Self-hosted so public pages never wait on a font service. */
  fonts: {
    outfit: { name: 'Outfit', family: "'Outfit Variable', system-ui, sans-serif", kind: 'sans' },
    fraunces: { name: 'Fraunces', family: "'Fraunces Variable', Georgia, serif", kind: 'serif' },
    'space-grotesk': { name: 'Space Grotesk', family: "'Space Grotesk Variable', system-ui, sans-serif", kind: 'sans' },
    bricolage: { name: 'Bricolage', family: "'Bricolage Grotesque Variable', system-ui, sans-serif", kind: 'sans' },
    nunito: { name: 'Nunito', family: "'Nunito Variable', system-ui, sans-serif", kind: 'sans' },
    playfair: { name: 'Playfair', family: "'Playfair Display Variable', Georgia, serif", kind: 'serif' },
    'jetbrains-mono': { name: 'JetBrains Mono', family: "'JetBrains Mono Variable', ui-monospace, monospace", kind: 'sans' },
    caveat: { name: 'Caveat', family: "'Caveat Variable', 'Segoe Print', cursive", kind: 'serif' }
  } satisfies Record<FontId, { name: string; family: string; kind: 'sans' | 'serif' }>,

  /**
   * The first theme is the default for new pages. Colors are checked by
   * `resolveTheme` and a test: text always keeps at least 4.5:1 contrast.
   */
  themes: [
    {
      id: 'canopy',
      name: 'Canopy',
      description: 'Deep forest with a bright new-leaf accent',
      background: { type: 'gradient', from: '#0F3A2A', to: '#07221A' },
      text: '#F4F7E9',
      accent: '#C6F36B',
      buttonFill: 'filled',
      buttonShape: 'pill',
      font: 'fraunces',
      pattern: 'none'
    },
    {
      id: 'broadside',
      name: 'Broadside',
      description: 'Newsprint, ink, and hard-edged shadows',
      background: { type: 'solid', color: '#F4EFE1' },
      text: '#1B1A17',
      accent: '#F2B8A0',
      buttonFill: 'shadow',
      buttonShape: 'rounded',
      font: 'bricolage',
      pattern: 'dots'
    },
    {
      id: 'marmalade',
      name: 'Marmalade',
      description: 'A warm sunset that glows on any phone',
      background: { type: 'gradient', from: '#FFD27A', to: '#FF8A65' },
      text: '#3A1408',
      accent: '#3A1408',
      buttonFill: 'filled',
      buttonShape: 'pill',
      font: 'outfit',
      pattern: 'none'
    },
    {
      id: 'afterhours',
      name: 'Afterhours',
      description: 'Ultraviolet night with neon outlines',
      background: { type: 'gradient', from: '#1A1140', to: '#0B0820' },
      text: '#F1EEFF',
      accent: '#B9A4FF',
      buttonFill: 'outline',
      buttonShape: 'pill',
      font: 'space-grotesk',
      pattern: 'grid'
    },
    {
      id: 'terminal',
      name: 'Terminal',
      description: 'Phosphor green on black, for the builders',
      background: { type: 'solid', color: '#0B0F0C' },
      text: '#D6F5DD',
      accent: '#5CF08A',
      buttonFill: 'outline',
      buttonShape: 'square',
      font: 'jetbrains-mono',
      pattern: 'lines'
    },
    {
      id: 'atelier',
      name: 'Atelier',
      description: 'Blush paper and quiet editorial serif',
      background: { type: 'solid', color: '#F7E7E1' },
      text: '#3D1F24',
      accent: '#7A2E3B',
      buttonFill: 'soft',
      buttonShape: 'rounded',
      font: 'playfair',
      pattern: 'none'
    },
    {
      id: 'citrus-pop',
      name: 'Citrus Pop',
      description: 'Loud yellow, chunky buttons, zero apologies',
      background: { type: 'solid', color: '#FFE14D' },
      text: '#191600',
      accent: '#191600',
      buttonFill: 'filled',
      buttonShape: 'square',
      font: 'nunito',
      pattern: 'none'
    },
    {
      id: 'tidepool',
      name: 'Tidepool',
      description: 'Sea glass and soft handwriting',
      background: { type: 'gradient', from: '#BDEBE3', to: '#7FC8D8' },
      text: '#0C2F38',
      accent: '#0C4A5A',
      buttonFill: 'soft',
      buttonShape: 'pill',
      font: 'caveat',
      pattern: 'none'
    }
  ] satisfies ThemePreset[] as ThemePreset[],

  /** Quick picks in the custom color fields. */
  accentSwatches: ['#14432F', '#C6F36B', '#E2632B', '#7C3AED', '#0E7490', '#DB2777', '#111111', '#FFFFFF'],

  /**
   * Names people can't claim. Every app route must be listed (a test checks
   * this). The rest protect the brand and common addresses people expect.
   */
  reservedUsernames: [
    // App routes
    'api', 'dashboard', 'example-link', 'forgot-password', 'go', 'media', 'og',
    'report', 'robots', 'sign-in', 'sign-up', 'sitemap', 'try',
    // Static files and build output
    'assets', 'examples', 'favicon', 'public', 'static', 'well-known',
    // Addresses people expect an app to own
    'about', 'account', 'accounts', 'admin', 'administrator', 'app', 'auth',
    'billing', 'blog', 'careers', 'contact', 'docs', 'editor', 'explore',
    'faq', 'help', 'home', 'jobs', 'legal', 'login', 'logout', 'mail', 'moderator',
    'news', 'null', 'pricing', 'privacy', 'register', 'root', 'security',
    'settings', 'signin', 'signout', 'signup', 'staff', 'status', 'support',
    'system', 'terms', 'undefined', 'user', 'users', 'webmaster', 'www',
    // Brand
    'linkleaf', 'layerwise', 'official'
  ],

  /** Enforced on the server. */
  limits: {
    usernameMin: 3,
    usernameMax: 30,
    displayNameMax: 60,
    bioMax: 160,
    linkTitleMax: 80,
    urlMax: 2048,
    maxLinks: 50,
    maxSocials: 8,
    avatarMaxBytes: 5 * 1024 * 1024,
    avatarTypes: ['image/jpeg', 'image/png', 'image/webp'],
    /** Avatars are resized to this size in the browser before upload. */
    avatarPixels: 512,
    reportDetailsMax: 1000
  },

  /** Per visitor, using a salted hash of the IP address. IPs are never stored. */
  rateLimits: {
    signUp: { limit: 15, windowSeconds: 3600 },
    signIn: { limit: 20, windowSeconds: 600 },
    usernameCheck: { limit: 40, windowSeconds: 60 },
    /** Over this limit the redirect still works; the click just isn't counted. */
    click: { limit: 60, windowSeconds: 60 },
    view: { limit: 60, windowSeconds: 60 },
    report: { limit: 5, windowSeconds: 3600 },
    upload: { limit: 20, windowSeconds: 600 },
    save: { limit: 240, windowSeconds: 60 },
    shareImage: { limit: 30, windowSeconds: 60 }
  },

  reportReasons: [
    { id: 'spam', label: 'Spam or misleading links' },
    { id: 'scam', label: 'Scam or phishing' },
    { id: 'impersonation', label: 'Pretending to be someone else' },
    { id: 'harmful', label: 'Hateful, violent, or adult content' },
    { id: 'other', label: 'Something else' }
  ]
} as const;

export type RateLimitScope = keyof typeof config.rateLimits;
