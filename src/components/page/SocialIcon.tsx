import type { SocialNetwork } from '~/lib/page-schema';
import { socialIconPaths } from '~/lib/social-icons';

export function SocialIcon({ network }: { network: SocialNetwork }) {
  const path = socialIconPaths[network];
  if (path) {
    return (
      <svg viewBox='0 0 24 24' fill='currentColor' aria-hidden='true'>
        <path d={path} />
      </svg>
    );
  }
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
    >
      {network === 'email' ? (
        <>
          <rect x='3' y='5' width='18' height='14' rx='2' />
          <path d='m3 7 9 6 9-6' />
        </>
      ) : (
        <>
          <circle cx='12' cy='12' r='9' />
          <path d='M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18' />
        </>
      )}
    </svg>
  );
}
