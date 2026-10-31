import { Link } from '@tanstack/react-router';
import { LogoMark } from '~/components/brand/Logo';

export function NotFound({ children }: { children?: React.ReactNode }) {
  return (
    <main className='flex min-h-dvh flex-col items-center justify-center gap-4 bg-background p-6 text-center'>
      <LogoMark className='size-12' />
      <h1 className='font-heading text-3xl font-semibold tracking-tight'>
        Page not found
      </h1>
      <div className='text-muted-foreground'>
        {children || <p>The page you’re looking for doesn’t exist.</p>}
      </div>
      <Link
        to='/'
        className='inline-flex h-11 items-center rounded-full bg-primary px-6 font-medium text-primary-foreground'
      >
        Back to home
      </Link>
    </main>
  );
}
