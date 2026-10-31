import { Link, useNavigate, useRouter } from '@tanstack/react-router';
import { LogOutIcon } from 'lucide-react';
import { Logo } from '~/components/brand/Logo';
import { Button } from '~/components/ui/button';
import { signOut } from '~/lib/auth-client';

export function AppHeader({ showNav = true }: { showNav?: boolean }) {
  const navigate = useNavigate();
  const router = useRouter();
  const navClass =
    'flex h-9 items-center rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground';
  return (
    <header className='border-b bg-card'>
      <div className='mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:h-16 sm:gap-6 sm:px-6'>
        <Logo />
        {showNav ? (
          <nav aria-label='Main' className='flex items-center gap-0.5'>
            <Link
              to='/dashboard'
              activeOptions={{ exact: true }}
              activeProps={{ className: 'bg-muted text-foreground!' }}
              className={navClass}
            >
              Editor
            </Link>
            <Link
              to='/dashboard/analytics'
              search={{ range: 7 }}
              activeProps={{ className: 'bg-muted text-foreground!' }}
              className={navClass}
            >
              Analytics
            </Link>
          </nav>
        ) : null}
        <Button
          variant='ghost'
          size='icon'
          className='ml-auto size-9 rounded-full'
          aria-label='Sign out'
          title='Sign out'
          onClick={async () => {
            await signOut();
            await router.invalidate();
            await navigate({ to: '/' });
          }}
        >
          <LogOutIcon className='size-4' />
        </Button>
      </div>
    </header>
  );
}
