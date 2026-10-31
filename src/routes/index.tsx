import { useEffect, useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import {
  ArrowRightIcon,
  CalendarClockIcon,
  ChartNoAxesColumnIcon,
  PaletteIcon,
  ShieldCheckIcon,
  SmartphoneIcon
} from 'lucide-react';
import { Logo } from '~/components/brand/Logo';
import { useUsernameCheck } from '~/components/editor/UsernameField';
import { PageView } from '~/components/page/PageView';
import { PhoneFrame } from '~/components/page/PhoneFrame';
import { Button } from '~/components/ui/button';
import { config } from '~/linkleaf.config';
import { getExamplePages } from '~/lib/pages.functions';
import { site, siteUrl } from '~/lib/site';
import { defaultThemeSettings, getPreset, resolveTheme } from '~/lib/theme';
import { normalizeUsername } from '~/lib/usernames';
import { seo } from '~/utils/seo';

export const Route = createFileRoute('/')({
  loader: () => getExamplePages(),
  head: () =>
    seo({
      title: `${config.name}: ${config.tagline}`,
      description: config.description,
      path: '/',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: site.name,
        url: siteUrl('/')
      }
    }),
  component: Home
});

function ClaimForm({ id, tone = 'light' }: { id: string; tone?: 'light' | 'dark' }) {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [host, setHost] = useState('');
  const check = useUsernameCheck(value);
  useEffect(() => setHost(window.location.host), []);
  const problem = check.state === 'problem' ? check : null;
  return (
    <form
      action='/sign-up'
      className='w-full max-w-md'
      onSubmit={(event) => {
        event.preventDefault();
        const username = normalizeUsername(value);
        void navigate({
          to: '/sign-up',
          search: username && !problem ? { username } : {}
        });
      }}
    >
      <div className='flex flex-col gap-2 rounded-3xl border bg-card p-2 text-foreground shadow-sm sm:flex-row sm:items-center sm:rounded-full'>
        <label htmlFor={id} className='flex min-h-11 min-w-0 flex-1 items-center pl-3 text-base'>
          <span className='max-w-[60%] flex-none truncate text-muted-foreground'>
            {host || 'yoursite.com'}/
          </span>
          <input
            id={id}
            name='username'
            aria-label='Choose your username'
            aria-describedby={`${id}-status`}
            placeholder='yourname'
            autoCapitalize='none'
            autoCorrect='off'
            spellCheck={false}
            className='h-11 w-full min-w-0 bg-transparent font-medium outline-none placeholder:font-normal placeholder:text-muted-foreground/70'
            value={value}
            onChange={(event) => setValue(normalizeUsername(event.target.value))}
          />
        </label>
        <Button type='submit' size='lg' className='h-11 flex-none rounded-full px-5'>
          Claim your page
        </Button>
      </div>
      <p
        id={`${id}-status`}
        aria-live='polite'
        className={`mt-2 min-h-5 pl-4 text-sm ${tone === 'dark' ? 'text-primary-foreground/90' : 'text-muted-foreground'}`}
      >
        {check.state === 'available'
          ? `Good news: /${value} is available.`
          : problem
            ? problem.message
            : null}
      </p>
    </form>
  );
}

const FEATURES = [
  {
    icon: SmartphoneIcon,
    title: 'Made for the browser inside Instagram',
    body: 'Most people will open your page from an in-app browser on a so-so connection. Pages are rendered on the server, with big tap targets and no pop-ups, so they show up fast and work the first time.'
  },
  {
    icon: PaletteIcon,
    title: `${config.themes.length} themes, then anything you like`,
    body: 'Start from a theme with real personality, then change the accent, background, buttons, and font. Whatever you choose, text stays readable, because contrast is checked as you go.'
  },
  {
    icon: CalendarClockIcon,
    title: 'Links that show up on time',
    body: 'Give a link a start date, an end date, or both. Drop day at 9 a.m.? Early-bird tickets that end on Friday? It’s checked on every visit, so nothing lingers.'
  },
  {
    icon: ChartNoAxesColumnIcon,
    title: 'Numbers you can act on',
    body: 'See page views, link clicks, click-through rate, your top links, and where visitors came from over the last 7 or 30 days. No raw IP addresses are stored.'
  },
  {
    icon: ShieldCheckIcon,
    title: 'Safe for your followers',
    body: 'Every link is checked on the server before it can go live, unsafe link types are refused, and every page has a way to report a problem.'
  }
];

function Home() {
  const examples = Route.useLoaderData();
  const [first, second, third] = examples;

  return (
    <div className='min-h-dvh overflow-x-clip bg-background text-foreground'>
      <header className='mx-auto flex h-16 max-w-6xl items-center gap-2 px-5 sm:px-8'>
        <Logo />
        <nav aria-label='Main' className='ml-auto flex items-center gap-1 sm:gap-2'>
          <a
            href='#examples'
            className='hidden h-10 items-center rounded-full px-3 text-sm font-medium text-muted-foreground hover:text-foreground sm:flex'
          >
            Examples
          </a>
          <Link
            to='/try'
            className='hidden h-10 items-center rounded-full px-3 text-sm font-medium text-muted-foreground hover:text-foreground sm:flex'
          >
            Try the editor
          </Link>
          <Button asChild variant='ghost' className='rounded-full'>
            <Link to='/sign-in'>Sign in</Link>
          </Button>
          <Button asChild className='rounded-full'>
            <Link to='/sign-up'>Sign up</Link>
          </Button>
        </nav>
      </header>

      <main>
        <section className='mx-auto grid max-w-6xl items-center gap-10 px-5 pt-8 pb-16 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:pt-14 lg:pb-24'>
          <div className='flex flex-col items-start'>
            <h1 className='font-heading text-5xl leading-[1.04] font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl'>
              One link for everything you’re growing.
            </h1>
            <p className='mt-5 max-w-xl text-lg text-pretty text-muted-foreground sm:text-xl'>
              Your shop, your videos, your newsletter, your next show. {config.name}{' '}
              puts them all on one fast, good-looking page, ready for your bio on
              Instagram, TikTok, or anywhere else.
            </p>
            <div className='mt-7 w-full'>
              <ClaimForm id='claim-hero' />
            </div>
            <p className='mt-1 pl-4 text-sm text-muted-foreground'>
              Just looking?{' '}
              <Link to='/try' className='font-medium text-foreground underline underline-offset-3'>
                Try the editor
              </Link>{' '}
              with no account.
            </p>
          </div>

          {first ? (
            <div className='relative mx-auto h-[440px] w-full max-w-[460px] sm:h-[540px]' aria-hidden='true'>
              {second ? (
                <div className='absolute top-8 left-0 -rotate-6 max-sm:hidden'>
                  <PhoneFrame scale={0.68}>
                    <PageView page={second} mode='static' />
                  </PhoneFrame>
                </div>
              ) : null}
              {third ? (
                <div className='absolute top-8 right-0 rotate-6 max-sm:hidden'>
                  <PhoneFrame scale={0.68}>
                    <PageView page={third} mode='static' />
                  </PhoneFrame>
                </div>
              ) : null}
              <div className='absolute top-0 left-1/2 -translate-x-1/2'>
                <PhoneFrame scale={0.8}>
                  <PageView page={first} mode='static' />
                </PhoneFrame>
              </div>
            </div>
          ) : null}
        </section>

        {examples.length > 0 ? (
          <section id='examples' className='scroll-mt-4 bg-primary py-16 text-primary-foreground sm:py-24'>
            <div className='mx-auto max-w-6xl px-5 sm:px-8'>
              <h2 className='max-w-2xl font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl'>
                {examples.length} pages, {examples.length} personalities
              </h2>
              <p className='mt-4 max-w-2xl text-lg text-pretty text-primary-foreground/85'>
                These people are made up, but the pages are real. Every theme, font,
                and button you see comes straight from the editor. Tap one to open it.
              </p>
            </div>
            <ul className='mx-auto mt-10 flex max-w-[1400px] snap-x snap-mandatory gap-6 overflow-x-auto px-5 pt-2 pb-6 sm:px-8 xl:justify-center'>
              {examples.map((page) => (
                <li key={page.username} className='flex-none snap-center'>
                  <Link
                    to='/$username'
                    params={{ username: page.username }}
                    className='group block rounded-[32px] focus-visible:ring-3 focus-visible:ring-highlight focus-visible:outline-none'
                    aria-label={`Open ${page.displayName}’s example page`}
                  >
                    <div className='transition-transform duration-200 group-hover:-translate-y-1.5 motion-reduce:transition-none'>
                      <PhoneFrame scale={0.72}>
                        <PageView page={page} mode='static' />
                      </PhoneFrame>
                    </div>
                    <p className='mt-4 text-center font-medium'>{page.displayName}</p>
                    <p className='text-center text-sm text-primary-foreground/80'>
                      {getPreset(page.theme.preset).name} theme
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className='mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24'>
          <h2 className='max-w-2xl font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl'>
            Your page, done before your coffee cools
          </h2>
          <ol className='mt-10 grid gap-8 md:grid-cols-3'>
            {[
              {
                title: 'Claim your name',
                body: 'Pick the address people will see, like /yourname. We’ll tell you right away if it’s free.'
              },
              {
                title: 'Add your links',
                body: 'Paste them in, drag them into order, and watch a live phone preview update as you go.'
              },
              {
                title: 'Put it in your bio',
                body: 'Copy your link into Instagram, TikTok, or anywhere else, then see what people tap.'
              }
            ].map((step, index) => (
              <li key={step.title} className='border-t-2 border-primary pt-4'>
                <p className='font-heading text-5xl font-semibold text-primary/30' aria-hidden='true'>
                  {index + 1}
                </p>
                <h3 className='mt-2 text-xl font-semibold'>{step.title}</h3>
                <p className='mt-2 text-pretty text-muted-foreground'>{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className='bg-muted py-16 sm:py-24'>
          <div className='mx-auto max-w-6xl px-5 sm:px-8'>
            <h2 className='max-w-2xl font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl'>
              Everything your link in bio should do
            </h2>
            <ul className='mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8' aria-label='Available themes'>
              {config.themes.map((theme) => {
                const resolved = resolveTheme(defaultThemeSettings(theme.id));
                return (
                  <li
                    key={theme.id}
                    className='ll-page ll-page--contained overflow-hidden rounded-2xl p-3'
                    style={resolved.vars as React.CSSProperties}
                    data-pattern={resolved.pattern}
                    data-font={resolved.font}
                  >
                    <p className='truncate text-base font-semibold'>{theme.name}</p>
                    <span className='ll-link mt-3 text-xs'>Your link</span>
                  </li>
                );
              })}
            </ul>
            <div className='mt-8 grid gap-x-10 gap-y-8 md:grid-cols-2'>
              {FEATURES.map((feature) => (
                <div key={feature.title} className='flex gap-4'>
                  <span className='grid size-11 flex-none place-items-center rounded-xl bg-primary text-primary-foreground'>
                    <feature.icon className='size-5' />
                  </span>
                  <div>
                    <h3 className='text-lg font-semibold'>{feature.title}</h3>
                    <p className='mt-1 text-pretty text-muted-foreground'>{feature.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className='mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24'>
          <div className='rounded-[32px] bg-highlight p-8 text-highlight-foreground sm:p-12'>
            <h2 className='max-w-2xl font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl'>
              Try it before you sign up
            </h2>
            <p className='mt-4 max-w-xl text-lg text-pretty'>
              Open the editor with sample data, no account needed. Your work saves in
              your browser, and if you like it, your draft comes with you when you
              sign up.
            </p>
            <Button asChild size='lg' className='mt-6 h-12 rounded-full px-6'>
              <Link to='/try'>
                Try the editor
                <ArrowRightIcon className='size-4' />
              </Link>
            </Button>
          </div>
        </section>

        <section className='mx-auto flex max-w-6xl flex-col items-center px-5 pb-20 text-center sm:px-8'>
          <h2 className='font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl'>
            Your name is still available. Probably.
          </h2>
          <p className='mt-3 mb-6 text-lg text-muted-foreground'>Check it now. It takes a second.</p>
          <ClaimForm id='claim-footer' />
        </section>
      </main>

      <footer className='border-t'>
        <div className='mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-8 text-sm text-muted-foreground sm:px-8'>
          <Logo className='text-foreground' />
          <p>{config.footerNote}</p>
          <nav aria-label='Footer' className='flex gap-5 sm:ml-auto'>
            <Link to='/try' className='hover:text-foreground'>Try the editor</Link>
            <Link to='/sign-in' className='hover:text-foreground'>Sign in</Link>
            <Link to='/sign-up' className='hover:text-foreground'>Sign up</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
