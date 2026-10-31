import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { beforeAll, describe, expect, it } from 'vitest';
import { resolveTheme } from '~/lib/theme';
import { checkUrl } from '~/lib/url-safety';
import { usernameProblem } from '~/lib/usernames';
import { pageDocSchema } from '~/lib/page-schema';

// Loaded at runtime so Vite doesn't try to bundle Node's built-in SQLite.
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as typeof import('node:sqlite');

type Row = Record<string, string | number | null>;

describe('migrations', () => {
  const db = new DatabaseSync(':memory:');
  let pages: Row[];
  let links: Row[];

  beforeAll(() => {
    db.exec('PRAGMA foreign_keys = ON');
    // In the order Drizzle applies them, statement by statement, like D1 does.
    for (const folder of readdirSync('drizzle').sort()) {
      const sql = readFileSync(join('drizzle', folder, 'migration.sql'), 'utf8');
      for (const statement of sql.split('--> statement-breakpoint')) {
        if (statement.trim()) db.exec(statement);
      }
    }
    pages = db.prepare('SELECT * FROM pages ORDER BY example_order').all() as Row[];
    links = db.prepare('SELECT * FROM links ORDER BY page_id, position').all() as Row[];
  });

  it('seeds three to five example pages, published and unowned', () => {
    expect(pages.length).toBeGreaterThanOrEqual(3);
    expect(pages.length).toBeLessThanOrEqual(5);
    for (const page of pages) {
      expect(page.user_id).toBeNull();
      expect(page.published).toBe(1);
      expect(page.example_order).not.toBeNull();
    }
  });

  it('gives examples usernames the app can route to', () => {
    for (const page of pages) {
      expect(usernameProblem(String(page.username)), String(page.username)).toBeNull();
    }
  });

  it('gives examples complete, valid pages', () => {
    for (const page of pages) {
      const pageLinks = links.filter((link) => link.page_id === page.id);
      expect(pageLinks.length).toBeGreaterThanOrEqual(3);
      const parsed = pageDocSchema.safeParse({
        displayName: page.display_name,
        bio: page.bio,
        socials: JSON.parse(String(page.socials)),
        links: pageLinks.map((link) => ({
          id: link.id,
          title: link.title,
          url: link.url,
          enabled: Boolean(link.enabled),
          startsAt: link.starts_at,
          endsAt: link.ends_at
        })),
        theme: JSON.parse(String(page.theme)),
        showCreateYourOwn: Boolean(page.show_create_your_own),
        published: Boolean(page.published)
      });
      expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
      expect(String(page.bio).length).toBeGreaterThan(20);
    }
  });

  it('gives each example a different theme and an existing avatar', () => {
    const presets = pages.map((page) => JSON.parse(String(page.theme)).preset);
    expect(new Set(presets).size).toBe(pages.length);
    for (const page of pages) {
      resolveTheme(JSON.parse(String(page.theme)));
      expect(() => readFileSync(join('public', String(page.avatar)))).not.toThrow();
    }
  });

  it('points example links only at reserved, non-real destinations', () => {
    for (const link of links) {
      const checked = checkUrl(String(link.url));
      expect(checked.ok).toBe(true);
      expect(String(link.url)).toMatch(/^(https:\/\/example\.com\/|mailto:[^@]+@example\.com)/);
    }
  });

  it('enforces one page per user and unique usernames', () => {
    expect(() =>
      db.exec(
        `INSERT INTO pages (id, username, display_name, theme, created_at, updated_at)
         VALUES ('dup', '${String(pages[0].username)}', 'x', '{}', 0, 0)`
      )
    ).toThrow();
  });
});
