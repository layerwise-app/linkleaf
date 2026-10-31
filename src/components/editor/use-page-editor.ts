import { useCallback, useEffect, useRef, useState } from 'react';
import { firstIssue, pageDocSchema } from '~/lib/page-schema';
import type { PageDoc } from '~/lib/page-schema';

export type SaveState =
  | { kind: 'saved'; at: number | null }
  | { kind: 'dirty' }
  | { kind: 'saving' }
  | { kind: 'invalid'; message: string }
  | { kind: 'error'; message: string };

const SAVE_DELAY = 700;

/**
 * Holds the page being edited and keeps it saved. Saves run one at a time, so a
 * slow request can never overwrite a newer one; changes made meanwhile go out
 * right after it finishes.
 */
export function usePageEditor(
  initial: PageDoc,
  persist: (doc: PageDoc) => Promise<void>
) {
  const [doc, setDoc] = useState(initial);
  const [state, setState] = useState<SaveState>({ kind: 'saved', at: null });

  const latest = useRef(doc);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);
  const queued = useRef(false);
  const dirty = useRef(false);
  const persistRef = useRef(persist);
  persistRef.current = persist;

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (inFlight.current) {
      queued.current = true;
      return;
    }
    if (!dirty.current) return;
    const parsed = pageDocSchema.safeParse(latest.current);
    if (!parsed.success) {
      setState({ kind: 'invalid', message: firstIssue(parsed.error) });
      return;
    }
    inFlight.current = true;
    dirty.current = false;
    setState({ kind: 'saving' });
    try {
      await persistRef.current(parsed.data);
      setState(
        dirty.current ? { kind: 'dirty' } : { kind: 'saved', at: Date.now() }
      );
    } catch (error) {
      dirty.current = true;
      setState({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Couldn’t save.'
      });
    } finally {
      inFlight.current = false;
      if (queued.current) {
        queued.current = false;
        void flush();
      }
    }
  }, []);

  const update = useCallback(
    (change: (current: PageDoc) => PageDoc) => {
      const next = change(latest.current);
      latest.current = next;
      dirty.current = true;
      setDoc(next);
      setState({ kind: 'dirty' });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), SAVE_DELAY);
    },
    [flush]
  );

  const replace = useCallback((next: PageDoc) => {
    latest.current = next;
    dirty.current = false;
    setDoc(next);
    setState({ kind: 'saved', at: Date.now() });
  }, []);

  // Warn before closing with unsaved work, and save on the way out of the page.
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty.current || inFlight.current) event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => {
      window.removeEventListener('beforeunload', warn);
      void flush();
    };
  }, [flush]);

  return { doc, state, update, replace, flush };
}
