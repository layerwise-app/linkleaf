import { CheckIcon, InfoIcon, RotateCcwIcon } from 'lucide-react';
import { useId } from 'react';
import { Button } from '~/components/ui/button';
import { Label } from '~/components/ui/label';
import { config } from '~/linkleaf.config';
import type {
  BackgroundSetting,
  ButtonFill,
  ButtonShape,
  FontId
} from '~/linkleaf.config';
import type { PageDoc } from '~/lib/page-schema';
import { defaultThemeSettings, getPreset, HEX_COLOR, resolveTheme } from '~/lib/theme';
import { cn } from '~/lib/utils';

type Update = (change: (current: PageDoc) => PageDoc) => void;

const FILLS: { id: ButtonFill; label: string }[] = [
  { id: 'filled', label: 'Filled' },
  { id: 'soft', label: 'Soft' },
  { id: 'outline', label: 'Outline' },
  { id: 'shadow', label: 'Shadow' }
];

const SHAPES: { id: ButtonShape; label: string }[] = [
  { id: 'pill', label: 'Pill' },
  { id: 'rounded', label: 'Rounded' },
  { id: 'square', label: 'Square' }
];

function ThemeCard({
  themeId,
  selected,
  onSelect
}: {
  themeId: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const preset = getPreset(themeId);
  const resolved = resolveTheme(defaultThemeSettings(themeId));
  return (
    <button
      type='button'
      aria-pressed={selected}
      aria-label={`${preset.name} theme: ${preset.description}`}
      onClick={onSelect}
      className={cn(
        'group flex flex-col overflow-hidden rounded-2xl border bg-card text-left transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        selected ? 'border-primary ring-2 ring-primary' : 'hover:shadow-md'
      )}
    >
      <span
        aria-hidden='true'
        className='ll-page ll-page--contained flex h-28 w-full flex-col items-center justify-center gap-1.5 overflow-hidden px-4'
        style={resolved.vars as React.CSSProperties}
        data-pattern={resolved.pattern}
        data-fill={resolved.buttonFill}
      >
        <span
          className='text-sm font-semibold'
        >
          Aa
        </span>
        <span
          className='ll-link w-full text-xs'
          style={{ boxShadow: resolved.buttonFill === 'shadow' ? `2px 2px 0 ${resolved.text}` : undefined }}
        >
          Link
        </span>
      </span>
      <span className='flex items-center justify-between gap-2 px-3 pt-2 pb-0.5 text-sm font-medium'>
        {preset.name}
        {selected ? <CheckIcon className='size-4 text-primary' /> : null}
      </span>
      <span className='line-clamp-2 px-3 pb-2.5 text-xs text-muted-foreground'>
        {preset.description}
      </span>
    </button>
  );
}

function ColorField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
}) {
  const id = useId();
  return (
    <div className='flex flex-col gap-1.5'>
      <Label htmlFor={id} className='font-normal text-muted-foreground'>
        {label}
      </Label>
      <div className='flex h-10 items-center gap-2 rounded-md border border-input px-2'>
        <input
          type='color'
          aria-label={`${label} picker`}
          className='size-7 flex-none cursor-pointer rounded border-0 bg-transparent p-0'
          value={value}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
        />
        <input
          id={id}
          className='w-full min-w-0 bg-transparent text-sm uppercase outline-none'
          spellCheck={false}
          maxLength={7}
          defaultValue={value}
          key={value}
          onChange={(event) => {
            const next = event.target.value.startsWith('#')
              ? event.target.value
              : `#${event.target.value}`;
            if (HEX_COLOR.test(next)) onChange(next.toUpperCase());
          }}
        />
      </div>
    </div>
  );
}

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className='flex flex-col gap-1.5'>
      <span className='text-sm text-muted-foreground'>{label}</span>
      <div role='group' aria-label={label} className='flex flex-wrap gap-1 rounded-xl bg-muted p-1'>
        {options.map((option) => (
          <button
            key={option.id}
            type='button'
            aria-pressed={value === option.id}
            onClick={() => onChange(option.id)}
            className={cn(
              'min-h-9 flex-1 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              value === option.id ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function DesignPanel({ doc, update }: { doc: PageDoc; update: Update }) {
  const { theme } = doc;
  const resolved = resolveTheme(theme);
  const preset = getPreset(theme.preset);
  const setTheme = (patch: Partial<PageDoc['theme']>) =>
    update((current) => ({ ...current, theme: { ...current.theme, ...patch } }));

  const currentBackground = theme.background ?? preset.background;
  const backgroundKind = theme.background?.type ?? 'theme';
  const firstColor =
    currentBackground.type === 'solid' ? currentBackground.color : currentBackground.from;
  const secondColor =
    currentBackground.type === 'solid' ? currentBackground.color : currentBackground.to;
  const setBackground = (background: BackgroundSetting | null) => setTheme({ background });
  const isCustom =
    theme.accent || theme.background || theme.buttonFill || theme.buttonShape || theme.font;

  return (
    <div className='flex flex-col gap-8'>
      <div>
        <h2 className='font-heading text-2xl font-semibold tracking-tight'>Design</h2>
        <p className='text-sm text-muted-foreground'>
          Start with a theme, then make it yours. Text stays readable whatever you
          pick.
        </p>
      </div>

      <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4'>
        {config.themes.map((option) => (
          <ThemeCard
            key={option.id}
            themeId={option.id}
            selected={theme.preset === option.id}
            onSelect={() =>
              update((current) => ({ ...current, theme: defaultThemeSettings(option.id) }))
            }
          />
        ))}
      </div>

      <div className='flex flex-col gap-6 rounded-2xl border bg-card p-4 sm:p-5'>
        <div className='flex items-center justify-between gap-3'>
          <h3 className='font-medium'>Customize</h3>
          {isCustom ? (
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className='rounded-full'
              onClick={() => setTheme(defaultThemeSettings(theme.preset))}
            >
              <RotateCcwIcon className='size-3.5' />
              Reset to {preset.name}
            </Button>
          ) : null}
        </div>

        <div className='flex flex-col gap-2'>
          <ColorField
            label='Accent color'
            value={theme.accent ?? preset.accent}
            onChange={(accent) => setTheme({ accent })}
          />
          <div className='flex flex-wrap gap-1.5'>
            {config.accentSwatches.map((color) => (
              <button
                key={color}
                type='button'
                aria-label={`Use accent ${color}`}
                onClick={() => setTheme({ accent: color })}
                className='size-7 rounded-full border border-black/15 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none'
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <div className='flex flex-col gap-3'>
          <Segmented
            label='Background'
            value={backgroundKind}
            options={[
              { id: 'theme', label: 'Theme' },
              { id: 'solid', label: 'Solid' },
              { id: 'gradient', label: 'Gradient' }
            ]}
            onChange={(kind) => {
              if (kind === 'theme') setBackground(null);
              if (kind === 'solid') setBackground({ type: 'solid', color: firstColor });
              if (kind === 'gradient') {
                setBackground({
                  type: 'gradient',
                  from: firstColor,
                  to: secondColor === firstColor ? '#FFFFFF' : secondColor
                });
              }
            }}
          />
          {theme.background?.type === 'solid' ? (
            <ColorField
              label='Background color'
              value={theme.background.color}
              onChange={(color) => setBackground({ type: 'solid', color })}
            />
          ) : null}
          {theme.background?.type === 'gradient' ? (
            <div className='grid grid-cols-2 gap-3'>
              <ColorField
                label='From'
                value={theme.background.from}
                onChange={(from) => setBackground({ type: 'gradient', from, to: secondColor })}
              />
              <ColorField
                label='To'
                value={theme.background.to}
                onChange={(to) => setBackground({ type: 'gradient', from: firstColor, to })}
              />
            </div>
          ) : null}
        </div>

        <Segmented
          label='Button style'
          value={resolved.buttonFill}
          options={FILLS}
          onChange={(buttonFill) => setTheme({ buttonFill })}
        />
        <Segmented
          label='Button shape'
          value={resolved.buttonShape}
          options={SHAPES}
          onChange={(buttonShape) => setTheme({ buttonShape })}
        />

        <div className='flex flex-col gap-1.5'>
          <span className='text-sm text-muted-foreground' id='font-label'>
            Font
          </span>
          <div role='group' aria-labelledby='font-label' className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
            {(Object.keys(config.fonts) as FontId[]).map((font) => (
              <button
                key={font}
                type='button'
                aria-pressed={resolved.font === font}
                onClick={() => setTheme({ font })}
                style={{ fontFamily: config.fonts[font].family }}
                className={cn(
                  'min-h-11 rounded-xl border px-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  resolved.font === font ? 'border-primary ring-1 ring-primary' : 'hover:bg-muted'
                )}
              >
                {config.fonts[font].name}
              </button>
            ))}
          </div>
        </div>

        {resolved.adjusted ? (
          <p className='flex items-start gap-2 rounded-xl bg-muted p-3 text-sm' role='status'>
            <InfoIcon className='mt-0.5 size-4 flex-none' />
            We adjusted these colors a little on your page so every word stays easy
            to read.
          </p>
        ) : null}
      </div>
    </div>
  );
}
