import { lazy, Suspense, useMemo, useRef, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRightIcon, ChartNoAxesColumnIcon, PencilIcon, RotateCcwIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Logo } from '~/components/brand/Logo';
import { PageEditor } from '~/components/editor/PageEditor';
import type { EditorAdapter } from '~/components/editor/types';
import { Button } from '~/components/ui/button';
import { Toaster } from '~/components/ui/sonner';
import { ANALYTICS_RANGES } from '~/lib/analytics';
import type { AnalyticsRange } from '~/lib/analytics';
import {
  clearDraft,
  loadDraft,
  sampleAnalytics,
  sampleDraft,
  saveDraft
} from '~/lib/draft';
import { blobToDataUrl, resizeAvatar } from '~/lib/image-resize';
import { cn } from '~/lib/utils';
import { seo } from '~/utils/seo';

const AnalyticsView = lazy(async () => ({
  default: (await import('~/components/analytics/AnalyticsView')).AnalyticsView
}));

export const Route = createFileRoute('/try')({
  // Everything here lives in this browser, so there's nothing to render on the server.
  ssr: false,
  head: () =>
    seo({
      title: 'Try the editor',
      description: 'Build a page with sample data, no account needed.',
      noindex: true
    }),
  component: TryPage
});

function TryPage() {
  const [start, setStart] = useState(() => loadDraft() ?? sampleDraft());
  const [revision, setRevision] = useState(0);
  const [view, setView] = useState<'editor' | 'analytics'>('editor');
  const [range, setRange] = useState<AnalyticsRange>(7);
  const [titles, setTitles] = useState(() => start.doc.links.map((link) => link.title));
  // Current values for the adapter, which outlives any one render.
  const current = useRef(start);

  const store = () => {
    if (!saveDraft(current.current)) {
      throw new Error('This browser won’t let us save your draft. Sign up to keep your work.');
    }
  };

  const adapter = useMemo<EditorAdapter>(
    () => ({
      mode: 'try',
      persist: async (doc) => {
        current.current = { ...current.current, doc };
        setTitles(doc.links.map((link) => link.title));
        store();
      },
      uploadAvatar: async (file) => {
        // Small enough to live in localStorage until sign-up uploads it.
        const avatar = await blobToDataUrl(await resizeAvatar(file, 256));
        current.current = { ...current.current, avatar };
        store();
        return avatar;
      },
      removeAvatar: async () => {
        current.current = { ...current.current, avatar: null };
        store();
      },
      changeUsername: async (username) => {
        current.current = { ...current.current, username };
        store();
        return username;
      }
    }),
    []
  );

  return (
    <div className='flex min-h-dvh flex-col bg-background'>
      <header className='border-b bg-card'>
        <div className='mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6'>
          <Logo />
          <p className='order-last w-full text-sm text-muted-foreground sm:order-none sm:w-auto sm:flex-1'>
            Try mode: your changes save in this browser only.
          </p>
          <Button asChild size='sm' className='ml-auto rounded-full'>
            <Link to='/sign-up'>
              Sign up and keep this draft
              <ArrowRightIcon className='size-4' />
            </Link>
          </Button>
        </div>
      </header>

      <div className='mx-auto flex w-full max-w-6xl items-center gap-1 px-4 pt-3 sm:px-6'>
        {(
          [
            { id: 'editor', label: 'Editor', icon: PencilIcon },
            { id: 'analytics', label: 'Analytics', icon: ChartNoAxesColumnIcon }
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type='button'
            aria-pressed={view === item.id}
            onClick={() => setView(item.id)}
            className={cn(
              'flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium',
              view === item.id ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <item.icon className='size-4' />
            {item.label}
          </button>
        ))}
        <Button
          variant='ghost'
          size='sm'
          className='ml-auto rounded-full text-muted-foreground'
          onClick={() => {
            clearDraft();
            const fresh = sampleDraft();
            current.current = fresh;
            setStart(fresh);
            setTitles(fresh.doc.links.map((link) => link.title));
            setRevision((value) => value + 1);
            toast('Started over with the sample page.');
          }}
        >
          <RotateCcwIcon className='size-3.5' />
          Start over
        </Button>
      </div>

      <div className={view === 'editor' ? 'contents' : 'hidden'}>
        <PageEditor
          key={revision}
          initialDoc={start.doc}
          initialUsername={start.username}
          initialAvatar={start.avatar}
          adapter={adapter}
          viewUrl={() => null}
        />
      </div>
      {view === 'analytics' ? (
        <main className='mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-16 sm:px-6'>
          <Suspense fallback={<p className='text-sm text-muted-foreground'>Loading…</p>}>
            <AnalyticsView
              sample
              data={sampleAnalytics(range, titles)}
              rangeControl={
                <div role='group' aria-label='Date range' className='flex gap-1 rounded-full bg-muted p-1'>
                  {ANALYTICS_RANGES.map((days) => (
                    <button
                      key={days}
                      type='button'
                      aria-pressed={range === days}
                      onClick={() => setRange(days)}
                      className={cn(
                        'flex h-9 items-center rounded-full px-3.5 text-sm font-medium',
                        range === days
                          ? 'bg-card shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {days} days
                    </button>
                  ))}
                </div>
              }
            />
          </Suspense>
        </main>
      ) : null}
      <Toaster position='bottom-center' />
    </div>
  );
}
