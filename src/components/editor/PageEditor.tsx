import { useMemo, useState } from 'react';
import {
  AlertCircleIcon,
  CheckIcon,
  ExternalLinkIcon,
  Link2Icon,
  LoaderCircleIcon,
  PaletteIcon,
  SettingsIcon,
  SmartphoneIcon,
  UserRoundIcon
} from 'lucide-react';
import { DesignPanel } from '~/components/editor/DesignPanel';
import { LinksPanel } from '~/components/editor/LinksPanel';
import { ProfilePanel } from '~/components/editor/ProfilePanel';
import { SettingsPanel } from '~/components/editor/SettingsPanel';
import type { EditorAdapter } from '~/components/editor/types';
import { usePageEditor } from '~/components/editor/use-page-editor';
import type { SaveState } from '~/components/editor/use-page-editor';
import { PageView } from '~/components/page/PageView';
import { PhoneFrame } from '~/components/page/PhoneFrame';
import { Button } from '~/components/ui/button';
import type { PageDoc } from '~/lib/page-schema';
import type { PublicPage } from '~/lib/public-page';
import { isLinkLive } from '~/lib/schedule';
import { cn } from '~/lib/utils';

const TABS = [
  { id: 'links', label: 'Links', icon: Link2Icon },
  { id: 'profile', label: 'Profile', icon: UserRoundIcon },
  { id: 'design', label: 'Design', icon: PaletteIcon },
  { id: 'settings', label: 'Settings', icon: SettingsIcon }
] as const;

type TabId = (typeof TABS)[number]['id'] | 'preview';

function SaveStatus({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  if (state.kind === 'saving' || state.kind === 'dirty') {
    return (
      <span className='flex items-center gap-1.5 text-sm text-muted-foreground' role='status'>
        <LoaderCircleIcon className='size-3.5 animate-spin' />
        Saving…
      </span>
    );
  }
  if (state.kind === 'invalid') {
    return (
      <span className='flex items-center gap-1.5 text-sm text-destructive' role='status'>
        <AlertCircleIcon className='size-3.5 flex-none' />
        {state.message}
      </span>
    );
  }
  if (state.kind === 'error') {
    return (
      <span className='flex items-center gap-2 text-sm text-destructive' role='alert'>
        <AlertCircleIcon className='size-3.5 flex-none' />
        {state.message}
        <Button variant='link' size='sm' className='h-auto p-0' onClick={onRetry}>
          Retry
        </Button>
      </span>
    );
  }
  return (
    <span className='flex items-center gap-1.5 text-sm text-muted-foreground' role='status'>
      <CheckIcon className='size-3.5' />
      {state.at ? 'Saved' : 'All changes saved'}
    </span>
  );
}

export function PageEditor({
  initialDoc,
  initialUsername,
  initialAvatar,
  adapter,
  viewUrl,
  banner
}: {
  initialDoc: PageDoc;
  initialUsername: string;
  initialAvatar: string | null;
  adapter: EditorAdapter;
  /** Where "View page" goes. Try mode has no public page yet. */
  viewUrl: (username: string) => string | null;
  banner?: React.ReactNode;
}) {
  const { doc, state, update, flush } = usePageEditor(initialDoc, adapter.persist);
  const [username, setUsername] = useState(initialUsername);
  const [avatar, setAvatar] = useState(initialAvatar);
  const [tab, setTab] = useState<TabId>('links');
  const page = viewUrl(username);

  const preview = useMemo<PublicPage>(() => {
    const now = Date.now();
    return {
      username,
      displayName: doc.displayName || 'Your name',
      bio: doc.bio,
      avatar,
      socials: doc.socials,
      links: doc.links
        .filter((link) => isLinkLive(link, now))
        .map(({ id, title }) => ({ id, title })),
      theme: doc.theme,
      showCreateYourOwn: doc.showCreateYourOwn,
      isExample: false,
      shareVersion: ''
    };
  }, [doc, username, avatar]);

  const offPage = doc.links.length - preview.links.length;
  const tabs = [
    ...TABS,
    { id: 'preview' as const, label: 'Preview', icon: SmartphoneIcon }
  ];

  return (
    <div className='mx-auto w-full max-w-6xl flex-1 px-4 pb-24 sm:px-6 lg:pb-12'>
      {banner}
      <div className='lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10'>
        <div className='min-w-0'>
          {/* The preview tab only exists on phones; beside the form on desktop. */}
          <div
            role='tablist'
            aria-label='Editor sections'
            className='sticky top-0 z-20 -mx-4 flex gap-0.5 bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:gap-1 sm:px-6 lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:backdrop-blur-none'
          >
            {tabs.map((item) => {
              const selected = tab === item.id;
              return (
                <button
                  key={item.id}
                  type='button'
                  role='tab'
                  id={`tab-${item.id}`}
                  aria-selected={selected}
                  aria-controls={item.id === 'preview' ? 'panel-preview' : `panel-${item.id}`}
                  onClick={() => setTab(item.id)}
                  className={cn(
                    'flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-1 text-[13px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:flex-none sm:px-3.5 sm:text-sm',
                    item.id === 'preview' && 'lg:hidden',
                    selected
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon className='hidden size-4 sm:block' />
                  {item.label}
                </button>
              );
            })}
            <div className='ml-auto hidden flex-none items-center pl-3 lg:flex'>
              <SaveStatus state={state} onRetry={() => void flush()} />
            </div>
          </div>
          <div className='mb-3 flex min-h-5 items-center justify-between gap-3 lg:hidden'>
            <SaveStatus state={state} onRetry={() => void flush()} />
            {page ? (
              <a
                href={page}
                target='_blank'
                rel='noreferrer'
                className='flex flex-none items-center gap-1 text-sm font-medium underline underline-offset-2'
              >
                View page <ExternalLinkIcon className='size-3.5' />
              </a>
            ) : null}
          </div>

          {/* On desktop, "preview" still shows the Links panel beside the phone. */}
          <section
            id='panel-links'
            role='tabpanel'
            aria-labelledby='tab-links'
            className={cn(
              tab === 'links' ? '' : tab === 'preview' ? 'hidden lg:block' : 'hidden'
            )}
          >
            <LinksPanel doc={doc} update={update} />
          </section>
          <section
            id='panel-profile'
            role='tabpanel'
            aria-labelledby='tab-profile'
            className={tab === 'profile' ? '' : 'hidden'}
          >
            <ProfilePanel
              doc={doc}
              update={update}
              avatar={avatar}
              adapter={adapter}
              onAvatarChange={setAvatar}
            />
          </section>
          <section
            id='panel-design'
            role='tabpanel'
            aria-labelledby='tab-design'
            className={tab === 'design' ? '' : 'hidden'}
          >
            <DesignPanel doc={doc} update={update} />
          </section>
          <section
            id='panel-settings'
            role='tabpanel'
            aria-labelledby='tab-settings'
            className={tab === 'settings' ? '' : 'hidden'}
          >
            <SettingsPanel
              doc={doc}
              update={update}
              username={username}
              adapter={adapter}
              onUsernameChange={setUsername}
            />
          </section>
        </div>

        <aside
          id='panel-preview'
          aria-label='Live preview'
          className={cn(
            'lg:block',
            tab === 'preview' ? 'block' : 'hidden'
          )}
        >
          <div className='flex flex-col items-center gap-3 lg:sticky lg:top-4 lg:pt-3'>
            <PhoneFrame>
              <PageView page={preview} mode='static' />
            </PhoneFrame>
            <div className='flex min-h-5 flex-col items-center gap-1 text-center text-sm text-muted-foreground'>
              {offPage > 0 ? (
                <span>
                  {offPage} {offPage === 1 ? 'link is' : 'links are'} hidden or
                  scheduled and not showing right now.
                </span>
              ) : null}
              {!doc.published ? <span>Your page is unpublished.</span> : null}
              {page ? (
                <a
                  href={page}
                  target='_blank'
                  rel='noreferrer'
                  className='hidden items-center gap-1 font-medium text-foreground underline underline-offset-2 lg:flex'
                >
                  View your page <ExternalLinkIcon className='size-3.5' />
                </a>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
