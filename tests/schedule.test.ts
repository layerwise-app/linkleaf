import { describe, expect, it } from 'vitest';
import { isLinkLive, linkStatus } from '~/lib/schedule';

const at = Date.UTC(2026, 10, 1, 12);
const link = (over = {}) => ({ enabled: true, startsAt: null, endsAt: null, ...over });

describe('linkStatus', () => {
  it('shows an unscheduled link', () => {
    expect(linkStatus(link(), at)).toBe('live');
  });
  it('hides a disabled link, even inside its window', () => {
    expect(linkStatus(link({ enabled: false, startsAt: at - 1, endsAt: at + 1 }), at)).toBe('hidden');
  });
  it('waits for the start time', () => {
    expect(linkStatus(link({ startsAt: at + 1 }), at)).toBe('scheduled');
  });
  it('goes live exactly at the start', () => {
    expect(isLinkLive(link({ startsAt: at }), at)).toBe(true);
  });
  it('ends exactly at the end', () => {
    expect(isLinkLive(link({ endsAt: at + 1 }), at)).toBe(true);
    expect(linkStatus(link({ endsAt: at }), at)).toBe('ended');
  });
});
