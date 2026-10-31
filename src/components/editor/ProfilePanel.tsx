import { useId, useRef, useState } from 'react';
import { ImagePlusIcon, LoaderCircleIcon, PlusIcon, Trash2Icon, XIcon } from 'lucide-react';
import type { EditorAdapter } from '~/components/editor/types';
import { SocialIcon } from '~/components/page/SocialIcon';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import { config } from '~/linkleaf.config';
import { avatarFileProblem } from '~/lib/image-resize';
import { socialNetworks } from '~/lib/page-schema';
import type { PageDoc, SocialNetwork } from '~/lib/page-schema';
import { socialLabels } from '~/lib/social-icons';
import { checkUrl } from '~/lib/url-safety';

type Update = (change: (current: PageDoc) => PageDoc) => void;

const PLACEHOLDERS: Partial<Record<SocialNetwork, string>> = {
  email: 'you@example.com',
  website: 'https://yoursite.com'
};

function SocialRow({
  network,
  url,
  onChange,
  onRemove
}: {
  network: SocialNetwork;
  url: string;
  onChange: (url: string) => void;
  onRemove: () => void;
}) {
  const [value, setValue] = useState(url.replace(/^mailto:/, ''));
  const [error, setError] = useState<string | null>(null);
  const label = socialLabels[network];
  return (
    <li className='flex flex-col gap-1'>
      <div className='flex items-center gap-2'>
        <span className='grid size-10 flex-none place-items-center rounded-full bg-muted [&_svg]:size-4.5' title={label}>
          <SocialIcon network={network} />
        </span>
        <Input
          aria-label={`${label} address`}
          inputMode={network === 'email' ? 'email' : 'url'}
          autoCapitalize='none'
          autoCorrect='off'
          placeholder={PLACEHOLDERS[network] ?? `https://${network}.com/you`}
          aria-invalid={error ? true : undefined}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            const checked = checkUrl(event.target.value);
            setError(checked.ok ? null : checked.error);
            if (checked.ok) onChange(checked.url);
          }}
        />
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='size-10 flex-none rounded-full'
          aria-label={`Remove ${label}`}
          onClick={onRemove}
        >
          <XIcon className='size-4' />
        </Button>
      </div>
      {error ? (
        <p role='alert' className='pl-12 text-sm text-destructive'>
          {error}
        </p>
      ) : null}
    </li>
  );
}

export function ProfilePanel({
  doc,
  update,
  avatar,
  adapter,
  onAvatarChange
}: {
  doc: PageDoc;
  update: Update;
  avatar: string | null;
  adapter: EditorAdapter;
  onAvatarChange: (avatar: string | null) => void;
}) {
  const id = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [newNetwork, setNewNetwork] = useState<SocialNetwork | ''>('');
  const [pending, setPending] = useState<SocialNetwork[]>([]);
  const { limits } = config;

  const onFile = async (file: File) => {
    setAvatarError(null);
    const problem = avatarFileProblem(file);
    if (problem) {
      setAvatarError(problem);
      return;
    }
    setUploading(true);
    try {
      onAvatarChange(await adapter.uploadAvatar(file));
    } catch (error) {
      setAvatarError(
        error instanceof Error ? error.message : 'That upload didn’t work. Try again.'
      );
    } finally {
      setUploading(false);
    }
  };

  const used = new Set([...doc.socials.map((s) => s.network), ...pending]);
  const available = socialNetworks.filter((network) => !used.has(network));
  const total = doc.socials.length + pending.length;

  return (
    <div className='flex flex-col gap-8'>
      <div>
        <h2 className='font-heading text-2xl font-semibold tracking-tight'>Profile</h2>
        <p className='text-sm text-muted-foreground'>
          The first thing people see when they open your page.
        </p>
      </div>

      <div className='flex items-center gap-4'>
        <div className='relative size-22 flex-none overflow-hidden rounded-full bg-muted'>
          {avatar ? (
            <img src={avatar} alt='Your avatar' className='size-full object-cover' />
          ) : (
            <div className='grid size-full place-items-center text-muted-foreground'>
              <ImagePlusIcon className='size-7' />
            </div>
          )}
          {uploading ? (
            <div className='absolute inset-0 grid place-items-center bg-background/70'>
              <LoaderCircleIcon className='size-6 animate-spin' />
            </div>
          ) : null}
        </div>
        <div className='flex min-w-0 flex-col gap-2'>
          <div className='flex flex-wrap gap-2'>
            <Button
              type='button'
              variant='outline'
              className='rounded-full'
              disabled={uploading}
              onClick={() => fileInput.current?.click()}
            >
              {avatar ? 'Change photo' : 'Upload a photo'}
            </Button>
            {avatar ? (
              <Button
                type='button'
                variant='ghost'
                className='rounded-full'
                disabled={uploading}
                onClick={async () => {
                  setAvatarError(null);
                  try {
                    await adapter.removeAvatar();
                    onAvatarChange(null);
                  } catch (error) {
                    setAvatarError(
                      error instanceof Error ? error.message : 'Couldn’t remove your photo.'
                    );
                  }
                }}
              >
                <Trash2Icon className='size-4' />
                Remove
              </Button>
            ) : null}
          </div>
          <p className='text-xs text-muted-foreground'>
            JPG, PNG, or WebP, up to {limits.avatarMaxBytes / (1024 * 1024)} MB.
          </p>
          <input
            ref={fileInput}
            data-testid='avatar-input'
            type='file'
            aria-label='Choose a profile photo'
            accept={limits.avatarTypes.join(',')}
            className='sr-only'
            tabIndex={-1}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) void onFile(file);
            }}
          />
        </div>
      </div>
      {avatarError ? (
        <p role='alert' className='-mt-5 text-sm text-destructive'>
          {avatarError}
        </p>
      ) : null}

      <div className='flex flex-col gap-1.5'>
        <Label htmlFor={`${id}-name`}>Name</Label>
        <Input
          id={`${id}-name`}
          maxLength={limits.displayNameMax}
          aria-invalid={!doc.displayName.trim() ? true : undefined}
          value={doc.displayName}
          onChange={(event) => {
            const displayName = event.target.value;
            update((current) => ({ ...current, displayName }));
          }}
        />
      </div>

      <div className='flex flex-col gap-1.5'>
        <div className='flex items-baseline justify-between'>
          <Label htmlFor={`${id}-bio`}>Bio</Label>
          <span className='text-xs text-muted-foreground'>
            {doc.bio.length}/{limits.bioMax}
          </span>
        </div>
        <Textarea
          id={`${id}-bio`}
          rows={3}
          maxLength={limits.bioMax}
          placeholder='A sentence or two about you.'
          value={doc.bio}
          onChange={(event) => {
            const bio = event.target.value;
            update((current) => ({ ...current, bio }));
          }}
        />
      </div>

      <div className='flex flex-col gap-3'>
        <div>
          <h3 className='font-medium'>Social icons</h3>
          <p className='text-sm text-muted-foreground'>
            Up to {limits.maxSocials}, shown under your bio.
          </p>
        </div>
        <ul className='flex flex-col gap-2'>
          {doc.socials.map((social) => (
            <SocialRow
              key={social.network}
              network={social.network}
              url={social.url}
              onChange={(url) =>
                update((current) => ({
                  ...current,
                  socials: current.socials.map((item) =>
                    item.network === social.network ? { ...item, url } : item
                  )
                }))
              }
              onRemove={() =>
                update((current) => ({
                  ...current,
                  socials: current.socials.filter((item) => item.network !== social.network)
                }))
              }
            />
          ))}
          {pending.map((network) => (
            <SocialRow
              key={network}
              network={network}
              url=''
              onChange={(url) => {
                setPending((list) => list.filter((item) => item !== network));
                update((current) => ({
                  ...current,
                  socials: [...current.socials, { network, url }]
                }));
              }}
              onRemove={() => setPending((list) => list.filter((item) => item !== network))}
            />
          ))}
        </ul>
        {total < limits.maxSocials ? (
          <div className='flex items-center gap-2'>
            <select
              aria-label='Choose a social network'
              className='h-10 min-w-0 flex-1 rounded-md border border-input bg-transparent px-3 text-sm'
              value={newNetwork}
              onChange={(event) => setNewNetwork(event.target.value as SocialNetwork)}
            >
              <option value=''>Choose a network…</option>
              {available.map((network) => (
                <option key={network} value={network}>
                  {socialLabels[network]}
                </option>
              ))}
            </select>
            <Button
              type='button'
              variant='outline'
              className='flex-none rounded-full'
              disabled={!newNetwork}
              onClick={() => {
                if (!newNetwork) return;
                setPending((list) => [...list, newNetwork]);
                setNewNetwork('');
              }}
            >
              <PlusIcon className='size-4' />
              Add
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
