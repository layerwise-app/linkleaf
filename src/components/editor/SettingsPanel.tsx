import { useEffect, useId, useState } from 'react';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { EditorAdapter } from '~/components/editor/types';
import { UsernameField, useUsernameCheck } from '~/components/editor/UsernameField';
import { Button } from '~/components/ui/button';
import { Label } from '~/components/ui/label';
import { Switch } from '~/components/ui/switch';
import { config } from '~/linkleaf.config';
import type { PageDoc } from '~/lib/page-schema';

type Update = (change: (current: PageDoc) => PageDoc) => void;

function SettingRow({
  title,
  description,
  checked,
  onChange
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <div className='flex items-center justify-between gap-4 rounded-2xl border bg-card p-4'>
      <div className='min-w-0'>
        <Label htmlFor={id} className='font-medium'>
          {title}
        </Label>
        <p className='mt-0.5 text-sm text-muted-foreground'>{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function SettingsPanel({
  doc,
  update,
  username,
  adapter,
  onUsernameChange
}: {
  doc: PageDoc;
  update: Update;
  username: string;
  adapter: EditorAdapter;
  onUsernameChange: (username: string) => void;
}) {
  const [value, setValue] = useState(username);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('');
  const check = useUsernameCheck(value, username);
  const isTry = adapter.mode === 'try';

  useEffect(() => setOrigin(window.location.origin), []);
  const address = `${origin}/${username}`;

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h2 className='font-heading text-2xl font-semibold tracking-tight'>Settings</h2>
        <p className='text-sm text-muted-foreground'>
          Your address and who can see your page.
        </p>
      </div>

      <form
        className='flex flex-col gap-3 rounded-2xl border bg-card p-4'
        onSubmit={async (event) => {
          event.preventDefault();
          if (value === username || check.state !== 'available') return;
          setSaving(true);
          try {
            const saved = await adapter.changeUsername(value);
            onUsernameChange(saved);
            setValue(saved);
            toast.success(isTry ? 'We’ll try to save that name for you.' : 'Your address changed.');
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Couldn’t change your username.');
          } finally {
            setSaving(false);
          }
        }}
      >
        <UsernameField
          label={isTry ? 'The username you’d like' : 'Username'}
          value={value}
          onChange={setValue}
          check={check}
        />
        {!isTry ? (
          <p className='text-xs text-muted-foreground'>
            Changing this changes your page’s address, and links you’ve already
            shared stop working.
          </p>
        ) : null}
        {value !== username ? (
          <Button
            type='submit'
            className='self-start rounded-full'
            disabled={saving || check.state !== 'available'}
          >
            {saving ? 'Saving…' : isTry ? 'Use this name' : 'Change username'}
          </Button>
        ) : null}
        {!isTry ? (
          <div className='flex items-center gap-2 border-t pt-3'>
            <span className='min-w-0 flex-1 truncate text-sm'>{address}</span>
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='flex-none rounded-full'
              onClick={async () => {
                await navigator.clipboard.writeText(address);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? <CheckIcon className='size-3.5' /> : <CopyIcon className='size-3.5' />}
              {copied ? 'Copied' : 'Copy link'}
            </Button>
          </div>
        ) : null}
      </form>

      <SettingRow
        title='Publish my page'
        description='When this is off, your page shows “not found” and leaves search.'
        checked={doc.published}
        onChange={(published) => update((current) => ({ ...current, published }))}
      />
      <SettingRow
        title={`Show “Create your own ${config.name}”`}
        description='A small link at the bottom of your page.'
        checked={doc.showCreateYourOwn}
        onChange={(showCreateYourOwn) =>
          update((current) => ({ ...current, showCreateYourOwn }))
        }
      />
    </div>
  );
}
