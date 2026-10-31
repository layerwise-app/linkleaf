import { useEffect, useId, useRef, useState } from 'react';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  CalendarClockIcon,
  ChevronDownIcon,
  EyeIcon,
  EyeOffIcon,
  GripVerticalIcon,
  PlusIcon,
  Trash2Icon
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { config } from '~/linkleaf.config';
import type { LinkDoc, PageDoc } from '~/lib/page-schema';
import { linkStatus } from '~/lib/schedule';
import type { LinkStatus } from '~/lib/schedule';
import { checkUrl } from '~/lib/url-safety';
import { cn } from '~/lib/utils';

type Update = (change: (current: PageDoc) => PageDoc) => void;

const STATUS: Record<LinkStatus, { label: string; variant: 'secondary' | 'outline' } | null> = {
  live: null,
  hidden: { label: 'Hidden', variant: 'outline' },
  scheduled: { label: 'Scheduled', variant: 'secondary' },
  ended: { label: 'Ended', variant: 'outline' }
};

/** Epoch ms to the local-time string a datetime-local input expects. */
function toLocalInput(ms: number | null): string {
  if (ms === null) return '';
  const date = new Date(ms);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const fromLocalInput = (value: string) =>
  value ? new Date(value).getTime() : null;

const displayUrl = (url: string) =>
  url.replace(/^mailto:/, '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

function AddLinkForm({
  onAdd,
  onCancel
}: {
  onAdd: (link: { title: string; url: string }) => void;
  onCancel: () => void;
}) {
  const id = useId();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => titleRef.current?.focus(), []);

  return (
    <form
      className='mb-3 flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm'
      onSubmit={(event) => {
        event.preventDefault();
        const checked = checkUrl(url);
        if (!checked.ok) {
          setError(checked.error);
          return;
        }
        if (!title.trim()) {
          setError('Give this link a title.');
          return;
        }
        onAdd({ title: title.trim(), url: checked.url });
      }}
    >
      <div className='flex flex-col gap-1.5'>
        <Label htmlFor={`${id}-title`}>Title</Label>
        <Input
          ref={titleRef}
          id={`${id}-title`}
          placeholder='My latest video'
          maxLength={config.limits.linkTitleMax}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setError(null);
          }}
        />
      </div>
      <div className='flex flex-col gap-1.5'>
        <Label htmlFor={`${id}-url`}>Link</Label>
        <Input
          id={`${id}-url`}
          inputMode='url'
          autoCapitalize='none'
          autoCorrect='off'
          placeholder='https://'
          aria-invalid={error ? true : undefined}
          value={url}
          onChange={(event) => {
            setUrl(event.target.value);
            setError(null);
          }}
        />
      </div>
      {error ? (
        <p role='alert' className='text-sm text-destructive'>
          {error}
        </p>
      ) : null}
      <div className='flex justify-end gap-2'>
        <Button type='button' variant='ghost' className='rounded-full' onClick={onCancel}>
          Cancel
        </Button>
        <Button type='submit' className='rounded-full'>
          Add link
        </Button>
      </div>
    </form>
  );
}

function LinkDetails({
  link,
  onChange
}: {
  link: LinkDoc;
  onChange: (patch: Partial<LinkDoc>) => void;
}) {
  const id = useId();
  const [title, setTitle] = useState(link.title);
  const [url, setUrl] = useState(link.url);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const setSchedule = (patch: Pick<LinkDoc, 'startsAt'> | Pick<LinkDoc, 'endsAt'>) => {
    const next = { startsAt: link.startsAt, endsAt: link.endsAt, ...patch };
    if (next.startsAt !== null && next.endsAt !== null && next.endsAt <= next.startsAt) {
      setScheduleError('The end must be after the start.');
      return;
    }
    setScheduleError(null);
    onChange(patch);
  };

  return (
    <div className='flex flex-col gap-3 border-t px-4 py-4'>
      <div className='flex flex-col gap-1.5'>
        <Label htmlFor={`${id}-title`}>Title</Label>
        <Input
          id={`${id}-title`}
          maxLength={config.limits.linkTitleMax}
          aria-invalid={!title.trim() ? true : undefined}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            if (event.target.value.trim()) onChange({ title: event.target.value });
          }}
        />
        {!title.trim() ? (
          <p className='text-sm text-destructive'>Give this link a title.</p>
        ) : null}
      </div>
      <div className='flex flex-col gap-1.5'>
        <Label htmlFor={`${id}-url`}>Link</Label>
        <Input
          id={`${id}-url`}
          inputMode='url'
          autoCapitalize='none'
          autoCorrect='off'
          aria-invalid={urlError ? true : undefined}
          value={url}
          onChange={(event) => {
            const value = event.target.value;
            setUrl(value);
            const checked = checkUrl(value);
            setUrlError(checked.ok ? null : checked.error);
            if (checked.ok) onChange({ url: checked.url });
          }}
        />
        {urlError ? (
          <p role='alert' className='text-sm text-destructive'>
            {urlError}
          </p>
        ) : null}
      </div>
      <fieldset className='flex flex-col gap-2'>
        <legend className='flex items-center gap-1.5 text-sm font-medium'>
          <CalendarClockIcon className='size-4' />
          Schedule (optional)
        </legend>
        <div className='grid gap-3 sm:grid-cols-2'>
          {(['startsAt', 'endsAt'] as const).map((field) => (
            <div key={field} className='flex min-w-0 flex-col gap-1.5'>
              <div className='flex items-center justify-between'>
                <Label htmlFor={`${id}-${field}`} className='font-normal text-muted-foreground'>
                  {field === 'startsAt' ? 'Show from' : 'Hide after'}
                </Label>
                {link[field] !== null ? (
                  <button
                    type='button'
                    className='text-xs underline underline-offset-2'
                    onClick={() => setSchedule({ [field]: null } as Pick<LinkDoc, 'startsAt'>)}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
              <Input
                id={`${id}-${field}`}
                type='datetime-local'
                className='min-w-0'
                value={toLocalInput(link[field])}
                onChange={(event) =>
                  setSchedule({
                    [field]: fromLocalInput(event.target.value)
                  } as Pick<LinkDoc, 'startsAt'>)
                }
              />
            </div>
          ))}
        </div>
        {scheduleError ? (
          <p role='alert' className='text-sm text-destructive'>
            {scheduleError}
          </p>
        ) : null}
        <p className='text-xs text-muted-foreground'>
          Times are in your time zone ({zone}).
        </p>
      </fieldset>
    </div>
  );
}

function LinkRow({
  link,
  onChange,
  onDelete
}: {
  link: LinkDoc;
  onChange: (patch: Partial<LinkDoc>) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: link.id });
  const status = STATUS[linkStatus(link, Date.now())];

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      data-testid='link-row'
      className={cn(
        'rounded-2xl border bg-card shadow-xs',
        isDragging && 'relative z-10 shadow-lg ring-2 ring-ring'
      )}
    >
      <div className='flex items-center gap-1 py-2 pr-2 pl-1'>
        <button
          type='button'
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${link.title}`}
          className='grid size-11 flex-none cursor-grab touch-none place-items-center rounded-lg text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:cursor-grabbing'
        >
          <GripVerticalIcon className='size-5' />
        </button>
        <button
          type='button'
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className='flex min-h-11 min-w-0 flex-1 flex-col items-start justify-center rounded-lg px-1 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
        >
          <span className='flex w-full items-center gap-2'>
            <span
              className={cn(
                'truncate font-medium',
                status && 'text-muted-foreground'
              )}
            >
              {link.title}
            </span>
            {status ? (
              <Badge variant={status.variant} className='flex-none'>
                {status.label}
              </Badge>
            ) : null}
          </span>
          <span className='w-full truncate text-sm text-muted-foreground'>
            {displayUrl(link.url)}
          </span>
        </button>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='size-10 flex-none rounded-full'
          aria-label={link.enabled ? `Hide ${link.title}` : `Show ${link.title}`}
          aria-pressed={!link.enabled}
          onClick={() => onChange({ enabled: !link.enabled })}
        >
          {link.enabled ? <EyeIcon className='size-4' /> : <EyeOffIcon className='size-4' />}
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='size-10 flex-none rounded-full'
          aria-label={`Delete ${link.title}`}
          onClick={onDelete}
        >
          <Trash2Icon className='size-4' />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='hidden size-10 flex-none rounded-full sm:inline-flex'
          aria-label={open ? `Close ${link.title}` : `Edit ${link.title}`}
          onClick={() => setOpen(!open)}
        >
          <ChevronDownIcon className={cn('size-4 transition-transform', open && 'rotate-180')} />
        </Button>
      </div>
      {open ? <LinkDetails link={link} onChange={onChange} /> : null}
    </li>
  );
}

export function LinksPanel({ doc, update }: { doc: PageDoc; update: Update }) {
  const [adding, setAdding] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const atLimit = doc.links.length >= config.limits.maxLinks;

  const titleOf = (id: unknown) =>
    doc.links.find((link) => link.id === id)?.title ?? 'link';
  const positionOf = (id: unknown) =>
    doc.links.findIndex((link) => link.id === id) + 1;

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    update((current) => {
      const from = current.links.findIndex((link) => link.id === active.id);
      const to = current.links.findIndex((link) => link.id === over.id);
      return { ...current, links: arrayMove(current.links, from, to) };
    });
  };

  const removeLink = (link: LinkDoc) => {
    const index = doc.links.findIndex((item) => item.id === link.id);
    update((current) => ({
      ...current,
      links: current.links.filter((item) => item.id !== link.id)
    }));
    toast(`Deleted “${link.title}”`, {
      action: {
        label: 'Undo',
        onClick: () =>
          update((current) => {
            const links = [...current.links];
            links.splice(index, 0, link);
            return { ...current, links };
          })
      }
    });
  };

  return (
    <div>
      <div className='mb-3 flex items-center justify-between gap-3'>
        <div>
          <h2 className='font-heading text-2xl font-semibold tracking-tight'>
            Your links
          </h2>
          <p className='text-sm text-muted-foreground'>
            Drag to reorder, or focus a handle and use Space and the arrow keys.
          </p>
        </div>
        <Button
          className='flex-none rounded-full'
          disabled={atLimit}
          onClick={() => setAdding(true)}
        >
          <PlusIcon className='size-4' />
          Add link
        </Button>
      </div>

      {adding ? (
        <AddLinkForm
          onCancel={() => setAdding(false)}
          onAdd={({ title, url }) => {
            update((current) => ({
              ...current,
              links: [
                {
                  id: crypto.randomUUID(),
                  title,
                  url,
                  enabled: true,
                  startsAt: null,
                  endsAt: null
                },
                ...current.links
              ]
            }));
            setAdding(false);
          }}
        />
      ) : null}

      {doc.links.length === 0 && !adding ? (
        <div className='rounded-2xl border border-dashed p-8 text-center'>
          <p className='font-medium'>No links yet</p>
          <p className='mt-1 text-sm text-muted-foreground'>
            Add your shop, your latest video, or anything else you want people to
            find.
          </p>
        </div>
      ) : (
        <DndContext
          id='links-dnd'
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
          accessibility={{
            screenReaderInstructions: {
              draggable:
                'To pick up a link, press Space. While it’s picked up, use the up and down arrow keys to move it. Press Space again to drop it, or Escape to cancel.'
            },
            announcements: {
              onDragStart: ({ active }) => `Picked up ${titleOf(active.id)}.`,
              onDragOver: ({ active, over }) =>
                over ? `${titleOf(active.id)} moved to position ${positionOf(over.id)}.` : undefined,
              onDragEnd: ({ active, over }) =>
                over ? `${titleOf(active.id)} dropped at position ${positionOf(over.id)}.` : undefined,
              onDragCancel: ({ active }) => `Cancelled. ${titleOf(active.id)} stayed in place.`
            }
          }}
        >
          <SortableContext
            items={doc.links.map((link) => link.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className='flex flex-col gap-2'>
              {doc.links.map((link) => (
                <LinkRow
                  key={link.id}
                  link={link}
                  onChange={(patch) =>
                    update((current) => ({
                      ...current,
                      links: current.links.map((item) =>
                        item.id === link.id ? { ...item, ...patch } : item
                      )
                    }))
                  }
                  onDelete={() => removeLink(link)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
