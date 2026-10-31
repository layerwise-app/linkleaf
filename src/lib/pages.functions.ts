import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { env } from 'cloudflare:workers';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '~/db';
import { links, pages, reports } from '~/db/schema';
import { config } from '~/linkleaf.config';
import { IMAGE_EXTENSIONS, sniffImageType } from '~/lib/image-sniff';
import { firstIssue, pageDocSchema, reportSchema } from '~/lib/page-schema';
import type { PageDoc } from '~/lib/page-schema';
import { loadExamplePages, loadPublicPage } from '~/lib/pages.server';
import { avatarSrc } from '~/lib/public-page';
import { hitRateLimit } from '~/lib/rate-limit.server';
import { isSameOrigin } from '~/lib/request.server';
import { ownerMiddleware } from '~/lib/owner-middleware';
import { getStorageErrorCode } from '~/lib/storage';
import { defaultThemeSettings } from '~/lib/theme';
import { normalizeUsername, usernameProblem } from '~/lib/usernames';

export type EditorData = {
  username: string;
  avatar: string | null;
  doc: PageDoc;
};

async function ownedPage(userId: string) {
  const [page] = await db
    .select()
    .from(pages)
    .where(eq(pages.userId, userId))
    .limit(1);
  return page ?? null;
}

const toDate = (ms: number | null) => (ms === null ? null : new Date(ms));

/* Public reads */

export const getPublicPage = createServerFn({ method: 'GET' })
  .validator((input: { username: string }) => ({
    username: normalizeUsername(String(input.username)).slice(0, 100)
  }))
  .handler(async ({ data }) => {
    const page = await loadPublicPage(data.username);
    if (!page) return null;
    const { id: _id, ...publicPage } = page;
    return publicPage;
  });

export const getExamplePages = createServerFn({ method: 'GET' }).handler(() =>
  loadExamplePages()
);

/* Usernames */

export type UsernameCheck =
  | { status: 'available' }
  | { status: 'invalid' | 'reserved' | 'rate_limited'; message: string }
  | { status: 'taken'; message: string; suggestions: string[] };

export const checkUsername = createServerFn({ method: 'POST' })
  .validator((input: { username: string }) => ({
    username: normalizeUsername(String(input.username)).slice(0, 100)
  }))
  .handler(async ({ data }): Promise<UsernameCheck> => {
    const headers = getRequestHeaders();
    if (!isSameOrigin(headers)) throw new Error('Forbidden');
    const limit = await hitRateLimit('usernameCheck', headers);
    if (!limit.allowed) {
      return {
        status: 'rate_limited',
        message: 'That’s a lot of checks. Give it a minute and try again.'
      };
    }
    const problem = usernameProblem(data.username);
    if (problem) return { status: problem.kind, message: problem.message };

    const candidates = [
      data.username,
      ...['page', 'hq', 'official', 'co'].map((suffix) =>
        `${data.username.slice(0, config.limits.usernameMax - suffix.length - 1)}-${suffix}`
      )
    ];
    const taken = new Set(
      (
        await db
          .select({ username: pages.username })
          .from(pages)
          .where(inArray(pages.username, candidates))
      ).map((row) => row.username)
    );
    if (!taken.has(data.username)) return { status: 'available' };
    return {
      status: 'taken',
      message: 'That name is taken.',
      suggestions: candidates
        .filter((name) => !taken.has(name) && !usernameProblem(name))
        .slice(0, 3)
    };
  });

function linkRows(pageId: string, doc: PageDoc, ids: string[]) {
  return doc.links.map((link, position) => ({
    id: ids[position],
    pageId,
    title: link.title,
    url: link.url,
    position,
    enabled: link.enabled,
    startsAt: toDate(link.startsAt),
    endsAt: toDate(link.endsAt)
  }));
}

/**
 * Creates the signed-in user's page. A draft from Try mode can come along, but
 * it's browser data like anything else: it's fully re-validated here, and its
 * link IDs are replaced with new ones.
 */
export const claimUsername = createServerFn({ method: 'POST' })
  .middleware([ownerMiddleware])
  .validator((input: { username: string; draft?: unknown }) => ({
    username: normalizeUsername(String(input.username)).slice(0, 100),
    draft: input.draft
  }))
  .handler(async ({ data, context }) => {
    const existing = await ownedPage(context.user.id);
    if (existing) return { username: existing.username, created: false };

    const limit = await hitRateLimit('usernameCheck', getRequestHeaders());
    if (!limit.allowed) {
      throw new Error('That’s a lot of attempts. Give it a minute and try again.');
    }
    const problem = usernameProblem(data.username);
    if (problem) throw new Error(problem.message);

    let doc: PageDoc = {
      displayName: (context.user.name || data.username).slice(
        0,
        config.limits.displayNameMax
      ),
      bio: '',
      socials: [],
      links: [],
      theme: defaultThemeSettings(),
      showCreateYourOwn: true,
      published: true
    };
    if (data.draft !== undefined) {
      const parsed = pageDocSchema.safeParse(data.draft);
      if (!parsed.success) throw new Error(firstIssue(parsed.error));
      doc = parsed.data;
    }

    // The unique indexes settle any race for the same name.
    const [created] = await db
      .insert(pages)
      .values({
        userId: context.user.id,
        username: data.username,
        displayName: doc.displayName,
        bio: doc.bio,
        socials: doc.socials,
        theme: doc.theme,
        showCreateYourOwn: doc.showCreateYourOwn,
        published: doc.published
      })
      .onConflictDoNothing()
      .returning({ id: pages.id });
    if (!created) {
      const raced = await ownedPage(context.user.id);
      if (raced) return { username: raced.username, created: false };
      throw new Error('That name was just taken. Try another.');
    }

    if (doc.links.length > 0) {
      const ids = doc.links.map(() => crypto.randomUUID());
      await db.insert(links).values(linkRows(created.id, doc, ids)).run();
    }
    return { username: data.username, created: true };
  });

export const changeUsername = createServerFn({ method: 'POST' })
  .middleware([ownerMiddleware])
  .validator((input: { username: string }) => ({
    username: normalizeUsername(String(input.username)).slice(0, 100)
  }))
  .handler(async ({ data, context }) => {
    const problem = usernameProblem(data.username);
    if (problem) throw new Error(problem.message);
    const limit = await hitRateLimit('usernameCheck', getRequestHeaders());
    if (!limit.allowed) throw new Error('Give it a minute and try again.');
    const [taken] = await db
      .select({ userId: pages.userId })
      .from(pages)
      .where(eq(pages.username, data.username))
      .limit(1);
    if (taken && taken.userId !== context.user.id) {
      throw new Error('That name is taken.');
    }
    try {
      await db
        .update(pages)
        .set({ username: data.username, updatedAt: new Date() })
        .where(eq(pages.userId, context.user.id))
        .run();
    } catch {
      throw new Error('That name was just taken. Try another.');
    }
    return { username: data.username };
  });

/* Editing */

export const getMyPage = createServerFn({ method: 'GET' })
  .middleware([ownerMiddleware])
  .handler(async ({ context }): Promise<EditorData | null> => {
    const page = await ownedPage(context.user.id);
    if (!page) return null;
    const rows = await db
      .select()
      .from(links)
      .where(eq(links.pageId, page.id))
      .orderBy(asc(links.position));
    return {
      username: page.username,
      avatar: avatarSrc(page.avatar),
      doc: {
        displayName: page.displayName,
        bio: page.bio,
        socials: page.socials,
        links: rows.map((link) => ({
          id: link.id,
          title: link.title,
          url: link.url,
          enabled: link.enabled,
          startsAt: link.startsAt?.getTime() ?? null,
          endsAt: link.endsAt?.getTime() ?? null
        })),
        theme: page.theme,
        showCreateYourOwn: page.showCreateYourOwn,
        published: page.published
      }
    };
  });

/**
 * Saves the whole page. The document is validated here regardless of what the
 * browser checked: javascript: and data: URLs fail the schema, and the page is
 * found from the session, never from the request.
 */
export const savePage = createServerFn({ method: 'POST' })
  .middleware([ownerMiddleware])
  .validator((input: unknown) => input)
  .handler(async ({ data, context }) => {
    const parsed = pageDocSchema.safeParse(data);
    if (!parsed.success) throw new Error(firstIssue(parsed.error));
    const doc = parsed.data;

    const limit = await hitRateLimit('save', getRequestHeaders());
    if (!limit.allowed) throw new Error('Saving too quickly. Try again shortly.');

    const page = await ownedPage(context.user.id);
    if (!page) throw new Error('Claim a username first.');

    const incomingIds = doc.links.map((link) => link.id);
    if (new Set(incomingIds).size !== incomingIds.length) {
      throw new Error('Two links have the same ID.');
    }
    // A link ID must be new or already ours. Link IDs are public (they're in
    // `/go/` URLs), so this stops anyone overwriting another person's link.
    if (incomingIds.length > 0) {
      const foreign = await db
        .select({ id: links.id, pageId: links.pageId })
        .from(links)
        .where(inArray(links.id, incomingIds));
      if (foreign.some((link) => link.pageId !== page.id)) {
        throw new Error('You can only edit your own links.');
      }
    }
    const existing = await db
      .select({ id: links.id })
      .from(links)
      .where(eq(links.pageId, page.id));
    const removed = existing
      .map((link) => link.id)
      .filter((id) => !incomingIds.includes(id));

    const statements = [
      db
        .update(pages)
        .set({
          displayName: doc.displayName,
          bio: doc.bio,
          socials: doc.socials,
          theme: doc.theme,
          showCreateYourOwn: doc.showCreateYourOwn,
          published: doc.published,
          updatedAt: new Date()
        })
        .where(eq(pages.id, page.id)),
      ...(removed.length > 0
        ? [
            db
              .delete(links)
              .where(and(eq(links.pageId, page.id), inArray(links.id, removed)))
          ]
        : []),
      ...linkRows(page.id, doc, incomingIds).map((row) =>
        db
          .insert(links)
          .values(row)
          .onConflictDoUpdate({
            target: links.id,
            set: {
              title: sql`excluded.title`,
              url: sql`excluded.url`,
              position: sql`excluded.position`,
              enabled: sql`excluded.enabled`,
              startsAt: sql`excluded.starts_at`,
              endsAt: sql`excluded.ends_at`
            },
            setWhere: eq(links.pageId, page.id)
          })
      )
    ];
    await db.batch(statements as [(typeof statements)[number], ...typeof statements]);
    return { savedAt: Date.now() };
  });

/* Avatars */

const STORAGE_ERRORS: Partial<Record<string, string>> = {
  StorageQuotaExceeded: 'Storage is full right now. Try again later.',
  FileTooLarge: 'This image is too large.',
  BlockedContent: 'This image can’t be used.'
};

/**
 * Size and type are judged here from the actual bytes. Files stay private in
 * Storage and are served through `/media/`, so the same code path works in the
 * local preview (which can't publish public files) and in production.
 */
export const uploadAvatar = createServerFn({ method: 'POST' })
  .middleware([ownerMiddleware])
  .validator((input: FormData) => {
    if (!(input instanceof FormData)) throw new Error('Choose an image.');
    const file = input.get('file');
    if (!(file instanceof File)) throw new Error('Choose an image.');
    return file;
  })
  .handler(async ({ data: file, context }) => {
    const limit = await hitRateLimit('upload', getRequestHeaders());
    if (!limit.allowed) throw new Error('Too many uploads. Try again in a few minutes.');

    const page = await ownedPage(context.user.id);
    if (!page) throw new Error('Claim a username first.');

    const maxBytes = config.limits.avatarMaxBytes;
    if (file.size > maxBytes) {
      throw new Error(`Use an image under ${maxBytes / (1024 * 1024)} MB.`);
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = sniffImageType(bytes);
    if (!type) throw new Error('Use a JPG, PNG, or WebP image.');

    const key = `avatars/${page.id}/${crypto.randomUUID()}.${IMAGE_EXTENSIONS[type]}`;
    try {
      await env.STORAGE.put(key, bytes, { contentType: type });
    } catch (error) {
      const code = getStorageErrorCode(error);
      const message = code && STORAGE_ERRORS[code];
      if (message) throw new Error(message);
      throw error;
    }
    await db
      .update(pages)
      .set({ avatar: key, updatedAt: new Date() })
      .where(eq(pages.id, page.id))
      .run();
    await deleteStoredAvatar(page.avatar);
    return { avatar: avatarSrc(key) };
  });

export const removeAvatar = createServerFn({ method: 'POST' })
  .middleware([ownerMiddleware])
  .handler(async ({ context }) => {
    const page = await ownedPage(context.user.id);
    if (!page) throw new Error('Claim a username first.');
    await db
      .update(pages)
      .set({ avatar: null, updatedAt: new Date() })
      .where(eq(pages.id, page.id))
      .run();
    await deleteStoredAvatar(page.avatar);
    return { avatar: null };
  });

async function deleteStoredAvatar(avatar: string | null) {
  if (!avatar?.startsWith('avatars/')) return;
  // The new avatar is already saved, so a failed cleanup mustn't fail the request.
  await env.STORAGE.delete(avatar).catch((error: unknown) => {
    console.error('[avatar] cleanup failed', error);
  });
}

/* Reports */

export const submitReport = createServerFn({ method: 'POST' })
  .validator((input: { username: string; reason: string; details: string; contactEmail: string }) => {
    const parsed = reportSchema.safeParse(input);
    if (!parsed.success) throw new Error(firstIssue(parsed.error));
    return parsed.data;
  })
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    if (!isSameOrigin(headers)) throw new Error('Forbidden');
    const limit = await hitRateLimit('report', headers);
    if (!limit.allowed) {
      throw new Error('You’ve sent several reports recently. Please try again later.');
    }
    const username = normalizeUsername(data.username);
    const [page] = await db
      .select({ id: pages.id })
      .from(pages)
      .where(eq(pages.username, username))
      .limit(1);
    if (!page) throw new Error('We couldn’t find that page.');
    await db
      .insert(reports)
      .values({
        pageId: page.id,
        username,
        reason: data.reason,
        details: data.details,
        contactEmail: data.contactEmail || null
      })
      .run();
    return { ok: true };
  });
