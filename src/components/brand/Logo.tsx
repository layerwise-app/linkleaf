import { Link } from '@tanstack/react-router';
import { config } from '~/linkleaf.config';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 32 32' className={className} aria-hidden='true'>
      <rect width='32' height='32' rx='9' fill='var(--primary)' />
      <path
        d='M8 23c0-9 6-15 17-15 0 11-6 17-14 16'
        fill='var(--highlight)'
      />
      <path
        d='M8 25c2-6 6-10 11-12'
        fill='none'
        stroke='var(--primary)'
        strokeWidth='2'
        strokeLinecap='round'
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      to='/'
      className={`inline-flex items-center gap-2 font-heading text-xl font-semibold tracking-tight ${className ?? ''}`}
    >
      <LogoMark className='size-7' />
      {config.name}
    </Link>
  );
}
