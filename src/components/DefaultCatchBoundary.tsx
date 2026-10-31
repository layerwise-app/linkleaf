import { Link, useRouter } from '@tanstack/react-router';
import type { ErrorComponentProps } from '@tanstack/react-router';

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
  const router = useRouter();
  console.error(error);

  return (
    <main className='flex min-h-dvh flex-col items-center justify-center gap-4 bg-background p-6 text-center'>
      <h1 className='font-heading text-3xl font-semibold tracking-tight'>
        Something went wrong
      </h1>
      <p className='max-w-sm text-muted-foreground'>
        That’s on us. Try again, and if it keeps happening, come back in a little
        while.
      </p>
      <div className='flex flex-wrap justify-center gap-3'>
        <button
          type='button'
          onClick={() => router.invalidate()}
          className='inline-flex h-11 items-center rounded-full bg-primary px-6 font-medium text-primary-foreground'
        >
          Try again
        </button>
        <Link
          to='/'
          className='inline-flex h-11 items-center rounded-full border px-6 font-medium'
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
