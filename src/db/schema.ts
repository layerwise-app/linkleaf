import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text
} from 'drizzle-orm/sqlite-core';
import type { ThemeSettings } from '~/lib/theme';
import type { SocialDoc } from '~/lib/page-schema';

// Better Auth tables. After adding an auth plugin, run
// `pnpm run auth:generate --yes`, copy only its new tables and columns from the
// generated `auth-schema.ts` into this section, then delete that file.

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' })
    .notNull()
    .default(false),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  role: text('role'),
  banned: integer('banned', { mode: 'boolean' }).default(false),
  banReason: text('ban_reason'),
  banExpires: integer('ban_expires', { mode: 'timestamp' })
});

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  impersonatedBy: text('impersonated_by')
});

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', {
    mode: 'timestamp'
  }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', {
    mode: 'timestamp'
  }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date()
  ),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date()
  )
});

// Linkleaf tables.

export const pages = sqliteTable('pages', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  // Null only for the seeded example pages, which nobody can sign in to edit.
  userId: text('user_id')
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  username: text('username').notNull().unique(),
  displayName: text('display_name').notNull(),
  bio: text('bio').notNull().default(''),
  // A Storage key (`avatars/...`) or a `public/` path (`/examples/...`).
  avatar: text('avatar'),
  socials: text('socials', { mode: 'json' })
    .$type<SocialDoc[]>()
    .notNull()
    .default([]),
  theme: text('theme', { mode: 'json' }).$type<ThemeSettings>().notNull(),
  showCreateYourOwn: integer('show_create_your_own', { mode: 'boolean' })
    .notNull()
    .default(true),
  published: integer('published', { mode: 'boolean' }).notNull().default(true),
  // Set on seeded pages: shown on the landing page in this order, not tracked.
  exampleOrder: integer('example_order'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date())
});

export const links = sqliteTable(
  'links',
  {
    id: text('id').primaryKey(),
    pageId: text('page_id')
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    url: text('url').notNull(),
    position: integer('position').notNull(),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    // Checked against the clock when the page is requested.
    startsAt: integer('starts_at', { mode: 'timestamp_ms' }),
    endsAt: integer('ends_at', { mode: 'timestamp_ms' })
  },
  (table) => [index('links_page_position_idx').on(table.pageId, table.position)]
);

// Analytics are daily counters, so the database stays small however much
// traffic a page gets. No IP address or per-visitor data is stored. `day` is a
// UTC date like 2026-11-01; `source` is a slug like `instagram` or `direct`.
export const pageDailyStats = sqliteTable(
  'page_daily_stats',
  {
    pageId: text('page_id')
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),
    day: text('day').notNull(),
    source: text('source').notNull(),
    views: integer('views').notNull().default(0),
    clicks: integer('clicks').notNull().default(0)
  },
  (table) => [primaryKey({ columns: [table.pageId, table.day, table.source] })]
);

// Keeps a link's clicks and last title after the link itself is deleted.
export const linkDailyStats = sqliteTable(
  'link_daily_stats',
  {
    linkId: text('link_id').notNull(),
    pageId: text('page_id')
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),
    day: text('day').notNull(),
    title: text('title').notNull(),
    clicks: integer('clicks').notNull().default(0)
  },
  (table) => [
    primaryKey({ columns: [table.linkId, table.day] }),
    index('link_daily_stats_page_day_idx').on(table.pageId, table.day)
  ]
);

export const reports = sqliteTable(
  'reports',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    pageId: text('page_id').references(() => pages.id, {
      onDelete: 'set null'
    }),
    // Kept so a report still makes sense after the page is gone.
    username: text('username').notNull(),
    reason: text('reason').notNull(),
    details: text('details').notNull().default(''),
    contactEmail: text('contact_email'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date())
  },
  (table) => [index('reports_created_at_idx').on(table.createdAt)]
);

// `key` is a salted SHA-256 hash of the scope and visitor, never a raw IP.
export const rateLimits = sqliteTable(
  'rate_limits',
  {
    key: text('key').primaryKey(),
    count: integer('count').notNull(),
    resetAt: integer('reset_at').notNull()
  },
  (table) => [index('rate_limits_reset_at_idx').on(table.resetAt)]
);
