import { useEffect, useId, useState } from 'react';
import { CheckIcon, LoaderCircleIcon, XIcon } from 'lucide-react';
import { Label } from '~/components/ui/label';
import { checkUsername } from '~/lib/pages.functions';
import { normalizeUsername, usernameProblem } from '~/lib/usernames';

export type UsernameCheckState =
  | { state: 'idle' | 'checking' | 'available' }
  | { state: 'problem'; message: string; suggestions?: string[] };

/** Live availability, debounced. Rules run locally first to save a request. */
export function useUsernameCheck(raw: string, current?: string): UsernameCheckState {
  const [result, setResult] = useState<UsernameCheckState>({ state: 'idle' });

  useEffect(() => {
    const username = normalizeUsername(raw);
    if (!username || username === current) {
      setResult({ state: 'idle' });
      return;
    }
    const problem = usernameProblem(username);
    if (problem) {
      setResult({ state: 'problem', message: problem.message });
      return;
    }
    setResult({ state: 'checking' });
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const response = await checkUsername({ data: { username } });
        if (cancelled) return;
        if (response.status === 'available') {
          setResult({ state: 'available' });
        } else {
          setResult({
            state: 'problem',
            message: response.message,
            suggestions: response.status === 'taken' ? response.suggestions : undefined
          });
        }
      } catch {
        if (!cancelled) {
          setResult({ state: 'problem', message: 'Couldn’t check that name. Try again.' });
        }
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [raw, current]);

  return result;
}

export function UsernameField({
  label,
  value,
  onChange,
  check,
  autoFocus
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  check: UsernameCheckState;
  autoFocus?: boolean;
}) {
  const id = useId();
  const [host, setHost] = useState('');
  useEffect(() => setHost(window.location.host), []);
  const problem = check.state === 'problem' ? check : null;

  return (
    <div className='flex flex-col gap-1.5'>
      <Label htmlFor={id}>{label}</Label>
      <div className='flex h-10 min-w-0 items-center rounded-md border border-input bg-card pl-3 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 aria-invalid:border-destructive' aria-invalid={problem ? true : undefined}>
        <span className='max-w-[55%] flex-none truncate text-sm text-muted-foreground'>
          {host}/
        </span>
        <input
          id={id}
          className='h-full min-w-0 flex-1 bg-transparent text-base outline-none md:text-sm'
          placeholder='yourname'
          autoCapitalize='none'
          autoCorrect='off'
          spellCheck={false}
          autoFocus={autoFocus}
          aria-invalid={problem ? true : undefined}
          aria-describedby={`${id}-status`}
          value={value}
          onChange={(event) => onChange(normalizeUsername(event.target.value))}
        />
        <span className='flex-none px-3'>
          {check.state === 'checking' ? (
            <LoaderCircleIcon className='size-4 animate-spin text-muted-foreground' />
          ) : check.state === 'available' ? (
            <CheckIcon className='size-4 text-primary' />
          ) : problem ? (
            <XIcon className='size-4 text-destructive' />
          ) : null}
        </span>
      </div>
      <div id={`${id}-status`} aria-live='polite' className='min-h-5 text-sm'>
        {check.state === 'available' ? (
          <span className='text-primary'>That name is available.</span>
        ) : problem ? (
          <span className='text-destructive'>
            {problem.message}
            {problem.suggestions?.length ? (
              <>
                {' '}
                Try{' '}
                {problem.suggestions.map((name, index) => (
                  <span key={name}>
                    {index > 0 ? ', ' : ''}
                    <button
                      type='button'
                      className='font-medium underline underline-offset-2'
                      onClick={() => onChange(name)}
                    >
                      {name}
                    </button>
                  </span>
                ))}
                .
              </>
            ) : null}
          </span>
        ) : null}
      </div>
    </div>
  );
}
