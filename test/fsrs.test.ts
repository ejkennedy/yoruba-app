import { describe, it, expect } from 'vitest';
import { grade, isKnown } from '@/lib/fsrs';

const emptyCard = {
  id: 'c1',
  userId: 'u1',
  phraseId: 'p1',
  state: 'new' as const,
  due: new Date(),
  stability: 0,
  difficulty: 0,
  elapsedDays: 0,
  scheduledDays: 0,
  reps: 0,
  lapses: 0,
  lastReview: null,
  suspended: false,
  createdAt: new Date()
};

describe('fsrs.grade', () => {
  it('Again keeps card in learning/relearning', () => {
    const { next } = grade(emptyCard, 1);
    expect(['learning', 'relearning', 'new']).toContain(next.state);
    expect(next.lapses).toBeGreaterThanOrEqual(0);
  });

  it('Good advances a new card', () => {
    const { next } = grade(emptyCard, 3);
    expect(next.reps).toBe(1);
    expect(next.due!.getTime()).toBeGreaterThan(Date.now());
  });

  it('isKnown requires review state + ≥21d stability', () => {
    expect(isKnown({ ...emptyCard, state: 'review', stability: 30 * 1000 })).toBe(true);
    expect(isKnown({ ...emptyCard, state: 'review', stability: 10 * 1000 })).toBe(false);
    expect(isKnown({ ...emptyCard, state: 'learning', stability: 100 * 1000 })).toBe(false);
  });
});
