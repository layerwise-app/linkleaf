import { useEffect, useMemo, useState } from 'react';
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router';
import { SproutIcon } from 'lucide-react';
import { toast } from 'sonner';
import { AppHeader } from '~/components/editor/AppHeader';
import { PageEditor } from '~/components/editor/PageEditor';
import type { EditorAdapter } from '~/components/editor/types';
import { Button } from '~/components/ui/button';
import { clearDraft, dataUrlToBlob, loadDraft } from '~/lib/draft';
import type { Draft } from '~/lib/draft';
import { resizeAvatar } from '~/lib/image-resize';
import {
  changeUsername,
  getMyPage,
  removeAvatar,
  savePage,
  uploadAvatar
} from '~/lib/pages.functions';

export const Route = createFileRoute('/dashboard/')({
  // The editor is all client state, so it renders in the browser, with its data
  // and sign-in check still done on the server first.
  ssr: 'data-only',
  // The editor keeps its own state from this data, so it must never start from a
  // cached copy: the next autosave would overwrite newer work with it.
  gcTime: 0,
  staleTime: 0,
  preloadStaleTime: 0,
  preloadGcTime: 0,
  loader: async () => {
    const page = await getMyPage();
    if (!page) throw redirect({ to: '/dashboard/claim' });
    return page;
  },
  component: EditorPage
});

async function sendAvatar(file: Blob) {
  const form = new FormData();
  form.set('file', file, 'avatar.jpg');
  const { avatar } = await uploadAvatar({ data: form });
  return avatar;
}

const adapter: EditorAdapter = {
  mode: 'live',
  persist: async (doc) => {
    await savePage({ data: doc });
  },
  uploadAvatar: async (file) => sendAvatar(await resizeAvatar(file)),
  removeAvatar: async () => {
    await removeAvatar();
  },
  changeUsername: async (username) =>
    (await changeUsername({ data: { username } })).username
};

function EditorPage() {
  const loaded = Route.useLoaderData();
  const [page, setPage] = useState(loaded);
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [revision, setRevision] = useState(0);
  const [replacing, setReplacing] = useState(false);

  useEffect(() => setDraft(loadDraft()), []);

  // Someone with a page already can still bring a draft in, but only by choice.
  const replaceWithDraft = async () => {
    if (!draft) return;
    setReplacing(true);
    try {
      // New IDs, because every draft starts from the same sample links.
      await savePage({
        data: {
          ...draft.doc,
          links: draft.doc.links.map((link) => ({
            ...link,
            id: crypto.randomUUID()
          }))
        }
      });
      if (draft.avatar) await sendAvatar(await dataUrlToBlob(draft.avatar));
      clearDraft();
      setDraft(null);
      const fresh = await getMyPage();
      if (fresh) setPage(fresh);
      setRevision((value) => value + 1);
      void router.invalidate();
      toast.success('Your draft is now your page.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Couldn’t use your draft.');
    } finally {
      setReplacing(false);
    }
  };

  const banner = useMemo(
    () =>
      draft ? (
        <div className='mt-4 flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4'>
          <SproutIcon className='size-5 flex-none text-primary' />
          <p className='min-w-48 flex-1 text-sm'>
            You have a draft from Try mode. Replace your current page with it?
          </p>
          <div className='flex gap-2'>
            <Button
              variant='ghost'
              size='sm'
              className='rounded-full'
              onClick={() => {
                clearDraft();
                setDraft(null);
              }}
            >
              Discard draft
            </Button>
            <Button
              size='sm'
              className='rounded-full'
              disabled={replacing}
              onClick={() => void replaceWithDraft()}
            >
              {replacing ? 'Replacing…' : 'Replace my page'}
            </Button>
          </div>
        </div>
      ) : null,
    [draft, replacing]
  );

  return (
    <>
      <AppHeader />
      <PageEditor
        key={revision}
        initialDoc={page.doc}
        initialUsername={page.username}
        initialAvatar={page.avatar}
        adapter={adapter}
        viewUrl={(username) => `/${username}`}
        banner={banner}
      />
    </>
  );
}
