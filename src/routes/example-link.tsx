import { createFileRoute, Link } from '@tanstack/react-router';
import { SproutIcon } from 'lucide-react';
import { Logo } from '~/components/brand/Logo';
import { Button } from '~/components/ui/button';
import { normalizeUsername, usernameProblem } from '~/lib/usernames';
import { seo } from '~/utils/seo';

type Search = { from?: string; title?: string };

/** Where links on the made-up example pages lead. */
export const Route = createFileRoute('/example-link')({
  validateSearch: (search: Record<string, unknown>): Search => ({
    from: typeof search.from === 'string' ? search.from : undefined,
    title: typeof search.title === 'string' ? search.title.slice(0, 80) : undefined
  }),
  head: () => seo({ title: 'This is an example link', noindex: true }),
  component: ExampleLink
});

function ExampleLink() {
  const { from, title } = Route.useSearch();
  const username = from ? normalizeUsername(from) : null;
  const validPage = username && !usernameProblem(username);
  return (
    <div className='flex min-h-dvh flex-col bg-background'>
      <header className='px-5 py-5'>
        <Logo />
      </header>
      <main className='flex flex-1 flex-col items-center justify-center gap-4 px-6 pb-24 text-center'>
        <SproutIcon className='size-10 text-primary' />
        <h1 className='max-w-md text-balance font-heading text-3xl font-semibold tracking-tight'>
          {title ? `“${title}” is just an example` : 'This is just an example'}
        </h1>
        <p className='max-w-sm text-muted-foreground'>
          The people on our example pages are made up, so their links don’t go
          anywhere. On your page, this click would land right where you sent it,
          and it would show up in your analytics.
        </p>
        <div className='mt-2 flex flex-wrap justify-center gap-3'>
          <Button asChild size='lg' className='rounded-full'>
            <Link to='/sign-up'>Create your own</Link>
          </Button>
          {validPage ? (
            <Button asChild size='lg' variant='outline' className='rounded-full'>
              <Link to='/$username' params={{ username }}>
                Back to the example
              </Link>
            </Button>
          ) : null}
        </div>
      </main>
    </div>
  );
}
