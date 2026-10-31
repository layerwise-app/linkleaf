import { resolveTheme } from '~/lib/theme';
import { config } from '~/linkleaf.config';
import type { PublicPage } from '~/lib/public-page';
import { SocialIcon } from '~/components/page/SocialIcon';
import { socialLabels } from '~/lib/social-icons';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

/**
 * One public page. `static` renders the same design with no links inside, for
 * phone mockups that are previews or are themselves links.
 */
export function PageView({
  page,
  mode = 'live',
  source
}: {
  page: PublicPage;
  mode?: 'live' | 'static';
  /** Attached to link clicks so they're credited to the visitor's source. */
  source?: string | null;
}) {
  const theme = resolveTheme(page.theme);
  const isLive = mode === 'live';
  const query = source ? `?s=${encodeURIComponent(source)}` : '';
  // A mockup sits inside another page, which has its own landmarks and heading.
  const Main = isLive ? 'main' : 'div';
  const Name = isLive ? 'h1' : 'p';
  const Footer = isLive ? 'footer' : 'div';

  return (
    <div
      className='ll-page'
      style={theme.vars as React.CSSProperties}
      data-pattern={theme.pattern}
      data-fill={theme.buttonFill}
      data-font={theme.font}
    >
      <Main className='ll-main'>
        {page.isExample ? (
          <p className='ll-example-note'>Fictional example page</p>
        ) : null}
        {page.avatar ? (
          <img
            className='ll-avatar'
            src={page.avatar}
            alt={isLive ? `${page.displayName}’s avatar` : ''}
            width={104}
            height={104}
            decoding='async'
            fetchPriority={isLive ? 'high' : undefined}
            loading={isLive ? undefined : 'lazy'}
          />
        ) : (
          <div className='ll-avatar ll-avatar--monogram' aria-hidden='true'>
            {initials(page.displayName)}
          </div>
        )}
        <Name className='ll-name'>{page.displayName}</Name>
        {page.bio ? <p className='ll-bio'>{page.bio}</p> : null}

        {page.socials.length > 0 ? (
          <div className='ll-socials'>
            {page.socials.map((social) =>
              isLive ? (
                <a
                  key={`${social.network}-${social.url}`}
                  className='ll-social'
                  href={social.url}
                  rel='me noopener nofollow'
                  aria-label={socialLabels[social.network]}
                >
                  <SocialIcon network={social.network} />
                </a>
              ) : (
                <span
                  key={`${social.network}-${social.url}`}
                  className='ll-social'
                  title={socialLabels[social.network]}
                >
                  <SocialIcon network={social.network} />
                </span>
              )
            )}
          </div>
        ) : null}

        {page.links.length > 0 ? (
          <ul className='ll-links'>
            {page.links.map((link) => (
              <li key={link.id}>
                {isLive ? (
                  <a className='ll-link' href={`/go/${link.id}${query}`} rel='nofollow'>
                    {link.title}
                  </a>
                ) : (
                  <span className='ll-link'>{link.title}</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className='ll-empty'>
            {isLive ? 'No links here right now. Check back soon.' : 'Your links will show up here.'}
          </p>
        )}
      </Main>

      <Footer className='ll-footer'>
        {page.showCreateYourOwn ? (
          isLive ? (
            <a className='ll-create' href='/'>
              Create your own {config.name}
            </a>
          ) : (
            <span className='ll-create'>Create your own {config.name}</span>
          )
        ) : null}
        {isLive ? (
          <a className='ll-report' href={`/report/${page.username}`} rel='nofollow'>
            Report this page
          </a>
        ) : (
          <span className='ll-report'>Report this page</span>
        )}
      </Footer>
    </div>
  );
}
