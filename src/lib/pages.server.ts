import { and, asc, eq, inArray, isNotNull } from 'drizzle-orm';
import { db } from '~/db';
import { links, pages } from '~/db/schema';
import { isLinkLive } from '~/lib/schedule';
import { avatarSrc } from '~/lib/public-page';
import type { PublicPage } from '~/lib/public-page';
import { shareVersion } from '~/lib/share-image';

type PageRow = typeof pages.$inferSelect;

const LIVE_LINK_COLUMNS = {
  id: links.id,
  pageId: links.pageId,
  title: links.title,
  enabled: links.enabled,
  startsAt: links.startsAt,
  endsAt: links.endsAt
};

/** Evaluates schedules against this request's clock, on the server. */
function toPublicPage(
  page: PageRow,
  rows: {
    id: string;
    title: string;
    enabled: boolean;
    startsAt: Date | null;
    endsAt: Date | null;
  }[],
  now: number
): PublicPage {
  const live = rows
    .filter((link) =>
      isLinkLive(
        {
          enabled: link.enabled,
          startsAt: link.startsAt?.getTime() ?? null,
          endsAt: link.endsAt?.getTime() ?? null
        },
        now
      )
    )
    .map(({ id, title }) => ({ id, title }));
  const isExample = page.exampleOrder !== null;
  return {
    username: page.username,
    displayName: page.displayName,
    bio: page.bio,
    avatar: avatarSrc(page.avatar),
    // Example pages are made up, so their icons lead to the "example" notice.
    socials: isExample
      ? page.socials.map((social) => ({
          ...social,
          url: `/example-link?from=${encodeURIComponent(page.username)}`
        }))
      : page.socials,
    links: live,
    theme: page.theme,
    showCreateYourOwn: page.showCreateYourOwn,
    isExample,
    shareVersion: shareVersion({
      displayName: page.displayName,
      bio: page.bio,
      avatar: page.avatar,
      theme: page.theme,
      titles: live.map((link) => link.title)
    })
  };
}

export async function loadPublicPage(
  username: string
): Promise<(PublicPage & { id: string }) | null> {
  const [page] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.username, username), eq(pages.published, true)))
    .limit(1);
  if (!page) return null;
  const rows = await db
    .select(LIVE_LINK_COLUMNS)
    .from(links)
    .where(eq(links.pageId, page.id))
    .orderBy(asc(links.position));
  return { ...toPublicPage(page, rows, Date.now()), id: page.id };
}

export async function loadExamplePages(): Promise<PublicPage[]> {
  const examples = await db
    .select()
    .from(pages)
    .where(and(isNotNull(pages.exampleOrder), eq(pages.published, true)))
    .orderBy(asc(pages.exampleOrder));
  if (examples.length === 0) return [];
  const rows = await db
    .select(LIVE_LINK_COLUMNS)
    .from(links)
    .where(
      inArray(
        links.pageId,
        examples.map((page) => page.id)
      )
    )
    .orderBy(asc(links.position));
  const now = Date.now();
  return examples.map((page) =>
    toPublicPage(
      page,
      rows.filter((row) => row.pageId === page.id),
      now
    )
  );
}

export const loadPublishedPaths = () =>
  db
    .select({ username: pages.username, updatedAt: pages.updatedAt })
    .from(pages)
    .where(eq(pages.published, true))
    .orderBy(asc(pages.username))
    .limit(50_000);

