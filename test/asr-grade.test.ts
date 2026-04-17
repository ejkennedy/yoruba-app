import { describe, it, expect } from 'vitest';
import { score } from '@/lib/asr-grade';

describe('asr-grade score', () => {
  it('scores a perfect match near 100', () => {
    const s = score('Báwo ni', 'Báwo ni', 1200);
    expect(s.total).toBeGreaterThanOrEqual(95);
  });

  it('partial match with dropped tones scores low-ish but non-zero', () => {
    // Target has an acute tone; transcript drops it → heavy tone penalty is correct.
    const s = score('Ẹ ṣé', 'e se', 900);
    expect(s.total).toBeGreaterThan(10);
    expect(s.total).toBeLessThan(50);
    expect(s.tone).toBe(0); // diacritic lost
    expect(s.edit).toBeGreaterThan(0);
  });

  it('same phonemes + kept tones lands in the middle', () => {
    const s = score('Ẹ ṣé', 'ẹ ṣé', 900);
    expect(s.total).toBeGreaterThan(90);
  });

  it('empty transcript fails', () => {
    const s = score('Báwo ni', '', 700);
    expect(s.total).toBeLessThan(40);
  });

  it('too-short audio penalises length', () => {
    const s = score('Báwo ni', 'Báwo ni', 80);
    expect(s.lengthOk).toBe(0);
  });
});
