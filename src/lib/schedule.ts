type Schedule = {
  enabled: boolean;
  startsAt: number | null;
  endsAt: number | null;
};

export type LinkStatus = 'live' | 'hidden' | 'scheduled' | 'ended';

/** Where a link stands at `now`. The server runs this on every page request. */
export function linkStatus(link: Schedule, now: number): LinkStatus {
  if (!link.enabled) return 'hidden';
  if (link.startsAt !== null && now < link.startsAt) return 'scheduled';
  if (link.endsAt !== null && now >= link.endsAt) return 'ended';
  return 'live';
}

export const isLinkLive = (link: Schedule, now: number) =>
  linkStatus(link, now) === 'live';
