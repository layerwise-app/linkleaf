import { useEffect, useRef, useState } from 'react';
import {
  createFileRoute,
  Link,
  notFound,
  redirect
} from '@tanstack/react-router';
import { PageView } from '~/components/page/PageView';
import { LogoMark } from '~/components/brand/Logo';
import { fontPreload } from '~/lib/fonts';
import { getPublicPage } from '~/lib/pages.functions';
import { siteUrl } from '~/lib/site';
import { resolveTheme } from '~/lib/theme';
import { couldBeUsername, normalizeUsername } from '~/lib/usernames';
import { config } from '~/linkleaf.config';
import { seo } from '~/utils/seo';

export const Route = createFileRoute('/$username')({
  loader: async ({ params }) => {
    const username = normalizeUsername(params.username);
    if (username !== params.username) {
      throw redirect({
        to: '/$username',
        params: { username },
        statusCode: 301
      });
    }
    // Runs on the server for every request, including client-side navigation,
    // so link schedules are always checked against the server's clock.
    const page = await getPublicPage({ data: { username } });
    if (!page) throw notFound();
    return page;
  },
  head: ({ loaderData: page, params }) => {
    if (!page) return seo({ title: 'Page not found', noindex: true });
    const resolved = resolveTheme(page.theme);
    const title = `${page.displayName} (@${page.username}) | ${config.name}`;
    const description =
      page.bio || `${page.displayName}’s links, all in one place on ${config.name}.`;
    const path = `/${params.username}`;
    const image = `/og/${page.username}.png?v=${page.shareVersion}`;
    const head = seo({
      title,
      description,
      path,
      image,
      imageAlt: `${page.displayName}’s ${config.name} page`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        mainEntity: {
          '@type': 'Person',
          name: page.displayName,
          alternateName: page.username,
          description: page.bio || undefined,
          url: siteUrl(path),
          image: page.avatar?.startsWith('/') ? siteUrl(page.avatar) : undefined,
          sameAs: page.isExample ? undefined : page.socials.map((social) => social.url)
        }
      }
    });
    return {
      ...head,
      meta: [
        ...head.meta,
        { name: 'theme-color', content: resolved.themeColor }
      ],
      links: [...head.links, fontPreload(resolved.font)]
    };
  },
  notFoundComponent: PageNotFound,
  component: PublicPageRoute
});

function PublicPageRoute() {
  const page = Route.useLoaderData();
  const [source, setSource] = useState<string | null>(null);
  const tracked = useRef<string | null>(null);

  // Runs once per page visit, after load, in a real browser. Loader-based
  // counting would also count route preloads from the landing page.
  useEffect(() => {
    if (page.isExample || tracked.current === page.username) return;
    tracked.current = page.username;
    const params = new URLSearchParams(window.location.search);
    fetch('/api/track/view', {
      method: 'POST',
      keepalive: true,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        username: page.username,
        referrer: document.referrer,
        utmSource: params.get('utm_source')
      })
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        // Only used to tag this page's links for the visit.
        const tag = (body as { source?: string } | null)?.source;
        if (tag) setSource(tag);
      })
      .catch(() => {
        // Analytics must never affect the page.
      });
  }, [page.isExample, page.username]);

  return <PageView page={page} source={source} />;
}

function PageNotFound() {
  const { username } = Route.useParams();
  const canClaim = couldBeUsername(username);
  return (
    <main className='flex min-h-dvh flex-col items-center justify-center gap-5 bg-background p-6 text-center'>
      <LogoMark className='size-12' />
      <h1 className='font-heading text-3xl font-semibold tracking-tight'>
        Nobody’s planted anything here yet
      </h1>
      <p className='max-w-sm text-muted-foreground'>
        {canClaim
          ? `There’s no page at /${normalizeUsername(username)}. It could be yours.`
          : 'We couldn’t find that page.'}
      </p>
      <div className='flex flex-wrap justify-center gap-3'>
        {canClaim ? (
          <Link
            to='/sign-up'
            search={{ username: normalizeUsername(username) }}
            className='inline-flex h-11 items-center rounded-full bg-primary px-6 font-medium text-primary-foreground'
          >
            Claim this name
          </Link>
        ) : null}
        <Link
          to='/'
          className='inline-flex h-11 items-center rounded-full border px-6 font-medium'
        >
          Go to {config.name}
        </Link>
      </div>
    </main>
  );
}
