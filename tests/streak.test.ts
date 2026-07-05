import { describe, it, expect } from 'vitest';
import { computeStreak } from '../lib/streak';

describe('computeStreak', () => {
  it('gol ⇒ 0', () => {
    expect(computeStreak([], '2026-07-05')).toBe(0);
  });

  it('azi bifată, 3 zile consecutive', () => {
    const log = ['2026-07-03', '2026-07-04', '2026-07-05'];
    expect(computeStreak(log, '2026-07-05')).toBe(3);
  });

  it('azi nebifată încă, dar ieri da ⇒ streak-ul nu s-a rupt', () => {
    const log = ['2026-07-03', '2026-07-04'];
    expect(computeStreak(log, '2026-07-05')).toBe(2);
  });

  it('gol azi, gol ieri ⇒ streak rupt', () => {
    const log = ['2026-07-01', '2026-07-02'];
    expect(computeStreak(log, '2026-07-05')).toBe(0);
  });

  it('o zi lipsă în mijloc oprește numărătoarea', () => {
    const log = ['2026-07-01', '2026-07-03', '2026-07-04', '2026-07-05'];
    expect(computeStreak(log, '2026-07-05')).toBe(3);
  });
});
