import { useState } from 'react';
import {
  createFileRoute,
  redirect,
  useNavigate,
  useRouter
} from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { SproutIcon } from 'lucide-react';
import { toast } from 'sonner';
import { AppHeader } from '~/components/editor/AppHeader';
import { UsernameField, useUsernameCheck } from '~/components/editor/UsernameField';
import { Button } from '~/components/ui/button';
import {
  clearDraft,
  clearWantedUsername,
  dataUrlToBlob,
  loadDraft,
  loadWantedUsername,
  SAMPLE_USERNAME
} from '~/lib/draft';
import { claimUsername, getMyPage, uploadAvatar } from '~/lib/pages.functions';

export const Route = createFileRoute('/dashboard/claim')({
  ssr: 'data-only',
  loader: async () => {
    if (await getMyPage()) throw redirect({ to: '/dashboard' });
  },
  component: ClaimPage
});

function ClaimPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const [draft] = useState(loadDraft);
  const [username, setUsername] = useState(() => {
    const wanted = draft?.username !== SAMPLE_USERNAME ? draft?.username : null;
    return wanted ?? loadWantedUsername() ?? '';
  });
  const check = useUsernameCheck(username);

  const claim = useMutation({
    mutationFn: async () => {
      await claimUsername({ data: { username, draft: draft?.doc } });
      // The page exists now. A failed photo upload shouldn't undo that, and the
      // draft is only cleared once everything else has made it.
      if (draft?.avatar) {
        try {
          const form = new FormData();
          form.set('file', await dataUrlToBlob(draft.avatar), 'avatar.jpg');
          await uploadAvatar({ data: form });
        } catch {
          toast.error('We couldn’t bring your photo over. You can upload it again.');
        }
      }
      clearDraft();
      clearWantedUsername();
    },
    onSuccess: async () => {
      await router.invalidate();
      await navigate({ to: '/dashboard' });
    }
  });

  return (
    <>
      <AppHeader showNav={false} />
      <main className='flex flex-1 items-center justify-center p-4 pb-24'>
        <div className='w-full max-w-md rounded-3xl border bg-card p-6 shadow-sm sm:p-8'>
          <h1 className='font-heading text-3xl font-semibold tracking-tight'>
            Claim your name
          </h1>
          <p className='mt-2 text-muted-foreground'>
            This becomes your page’s address, the link you’ll put in your bio.
          </p>
          {draft ? (
            <p className='mt-4 flex gap-2 rounded-xl bg-muted p-3 text-sm'>
              <SproutIcon className='mt-0.5 size-4 flex-none text-primary' />
              Your draft comes with you: {draft.doc.links.length}{' '}
              {draft.doc.links.length === 1 ? 'link' : 'links'}, your design, and
              your profile.
            </p>
          ) : null}
          <form
            className='mt-6 flex flex-col gap-3'
            onSubmit={(event) => {
              event.preventDefault();
              if (check.state === 'available') claim.mutate();
            }}
          >
            <UsernameField
              label='Username'
              value={username}
              onChange={setUsername}
              check={check}
              autoFocus
            />
            {claim.error ? (
              <p role='alert' className='text-sm text-destructive'>
                {claim.error.message}
              </p>
            ) : null}
            <Button
              type='submit'
              size='lg'
              className='rounded-full'
              disabled={check.state !== 'available' || claim.isPending}
            >
              {claim.isPending ? 'Setting up your page…' : 'Claim and continue'}
            </Button>
          </form>
        </div>
      </main>
    </>
  );
}
