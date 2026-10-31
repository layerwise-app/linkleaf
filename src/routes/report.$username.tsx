import {
  createFileRoute,
  Link,
  notFound,
  useHydrated
} from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2Icon } from 'lucide-react';
import { Logo } from '~/components/brand/Logo';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import { getPublicPage, submitReport } from '~/lib/pages.functions';
import { config } from '~/linkleaf.config';
import { seo } from '~/utils/seo';

export const Route = createFileRoute('/report/$username')({
  loader: async ({ params }) => {
    const page = await getPublicPage({ data: { username: params.username } });
    if (!page) throw notFound();
    return { username: page.username, displayName: page.displayName };
  },
  head: () => seo({ title: 'Report a page', noindex: true }),
  component: ReportPage
});

function ReportPage() {
  const page = Route.useLoaderData();
  const hydrated = useHydrated();

  const report = useMutation({
    mutationFn: (form: FormData) =>
      submitReport({
        data: {
          username: page.username,
          reason: String(form.get('reason')),
          details: String(form.get('details') ?? ''),
          contactEmail: String(form.get('contact') ?? '')
        }
      })
  });

  return (
    <div className='min-h-dvh bg-background'>
      <header className='mx-auto flex max-w-lg items-center px-5 py-5'>
        <Logo />
      </header>
      <main className='mx-auto max-w-lg px-5 pb-16'>
        {report.isSuccess ? (
          <div className='rounded-2xl border bg-card p-6 text-center'>
            <CheckCircle2Icon className='mx-auto size-10 text-primary' />
            <h1 className='mt-3 font-heading text-2xl font-semibold'>
              Thanks for telling us
            </h1>
            <p className='mt-2 text-muted-foreground'>
              We’ve saved your report about {page.displayName}’s page and will
              review it.
            </p>
            <Button asChild variant='outline' className='mt-5 rounded-full'>
              <Link to='/$username' params={{ username: page.username }}>
                Back to the page
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <h1 className='font-heading text-3xl font-semibold tracking-tight'>
              Report this page
            </h1>
            <p className='mt-2 text-muted-foreground'>
              Tell us what’s wrong with{' '}
              <Link
                to='/$username'
                params={{ username: page.username }}
                className='font-medium text-foreground underline underline-offset-2'
              >
                /{page.username}
              </Link>
              . Reports are private and aren’t shared with the page’s owner.
            </p>
            {/* Read at submit time, so anything typed while the page was still
                loading on a slow connection is kept. */}
            <form
              method='post'
              className='mt-6 flex flex-col gap-5'
              onSubmit={(event) => {
                event.preventDefault();
                report.mutate(new FormData(event.currentTarget));
              }}
            >
              <fieldset className='flex flex-col gap-2'>
                <legend className='mb-1 text-sm font-medium'>
                  What’s the problem?
                </legend>
                {config.reportReasons.map((option, index) => (
                  <label
                    key={option.id}
                    className='flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border bg-card px-3 has-checked:border-primary has-checked:ring-1 has-checked:ring-primary'
                  >
                    <input
                      type='radio'
                      name='reason'
                      value={option.id}
                      defaultChecked={index === 0}
                      className='size-4 accent-(--primary)'
                    />
                    {option.label}
                  </label>
                ))}
              </fieldset>
              <div className='flex flex-col gap-2'>
                <Label htmlFor='details'>Anything else we should know?</Label>
                <Textarea
                  id='details'
                  name='details'
                  rows={4}
                  maxLength={config.limits.reportDetailsMax}
                />
              </div>
              <div className='flex flex-col gap-2'>
                <Label htmlFor='contact'>Your email (optional)</Label>
                <Input
                  id='contact'
                  name='contact'
                  type='email'
                  autoComplete='email'
                />
              </div>
              {report.error ? (
                <p role='alert' className='text-sm text-destructive'>
                  {report.error.message}
                </p>
              ) : null}
              <Button
                type='submit'
                size='lg'
                className='rounded-full'
                disabled={!hydrated || report.isPending}
              >
                {report.isPending ? 'Sending…' : 'Send report'}
              </Button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
