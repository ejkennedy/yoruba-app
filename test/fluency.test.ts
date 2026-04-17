import { describe, it, expect } from 'vitest';
import { rankFor, progressToNextRank, RANKS } from '@/lib/fluency';

describe('fluency ranks', () => {
  it('returns Ọmọ Tuntun for new learners', () => {
    expect(rankFor(0).slug).toBe('omo-tuntun');
    expect(rankFor(99).slug).toBe('omo-tuntun');
  });

  it('jumps tiers at boundaries', () => {
    expect(rankFor(100).slug).toBe('akekoo');
    expect(rankFor(500).slug).toBe('oloro');
    expect(rankFor(1200).slug).toBe('ayo');
    expect(rankFor(2500).slug).toBe('oba');
    expect(rankFor(5000).slug).toBe('ori-ola');
    expect(rankFor(9999).slug).toBe('ori-ola');
  });

  it('progressToNextRank returns sensible pct', () => {
    const { pct, remaining, next } = progressToNextRank(300);
    expect(next?.slug).toBe('oloro');
    expect(pct).toBeGreaterThan(0);
    expect(pct).toBeLessThan(1);
    expect(remaining).toBe(200);
  });

  it('terminal rank has no next', () => {
    const { next, pct } = progressToNextRank(10000);
    expect(next).toBeNull();
    expect(pct).toBe(1);
  });

  it('covers every rank', () => {
    expect(RANKS.map((r) => r.slug)).toEqual([
      'omo-tuntun',
      'akekoo',
      'oloro',
      'ayo',
      'oba',
      'ori-ola'
    ]);
  });
});
