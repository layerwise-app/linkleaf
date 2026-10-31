import { describe, expect, it } from 'vitest';
import { clickThroughRate, dayRange, fillDays } from '~/lib/analytics';

const now = Date.UTC(2026, 2, 2, 23, 59);

describe('dayRange', () => {
  it('returns exactly the requested days, ending today', () => {
    const days = dayRange(7, now);
    expect(days).toHaveLength(7);
    expect(days[0]).toBe('2026-02-24');
    expect(days[6]).toBe('2026-03-02');
  });
  it('handles 30 days across a month boundary', () => {
    const days = dayRange(30, now);
    expect(days).toHaveLength(30);
    expect(new Set(days).size).toBe(30);
  });
});

describe('clickThroughRate', () => {
  it('never divides by zero', () => {
    expect(clickThroughRate(0, 0)).toBe(0);
    expect(clickThroughRate(0, 5)).toBe(0);
  });
  it('is clicks over views', () => {
    expect(clickThroughRate(200, 50)).toBe(0.25);
  });
});

describe('fillDays', () => {
  it('fills gaps with zeros and keeps order', () => {
    const days = ['2026-03-01', '2026-03-02', '2026-03-03'];
    expect(fillDays(days, [{ day: '2026-03-02', views: 3, clicks: 1 }])).toEqual([
      { day: '2026-03-01', views: 0, clicks: 0 },
      { day: '2026-03-02', views: 3, clicks: 1 },
      { day: '2026-03-03', views: 0, clicks: 0 }
    ]);
  });
});
