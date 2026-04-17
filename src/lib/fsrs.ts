/**
 * FSRS-5 wrapper. We store stability/difficulty as integers × 1000 (millidays,
 * milli-difficulty) to avoid Drizzle real-column headaches on D1 and still keep
 * enough precision. Everything is converted on the boundaries of this module.
 */

import { FSRS, generatorParameters, Rating, State, type Card as FSRSCard, type RecordLogItem } from 'ts-fsrs';
import type { cards as CardsTable } from '@/db/schema';

// One shared scheduler. FSRS-5 default parameters.
const fsrs = new FSRS(
  generatorParameters({
    maximum_interval: 365 * 2,
    enable_fuzz: true
  })
);

export type StoredCard = typeof CardsTable.$inferSelect;

const stateFromStr = (s: string): State =>
  s === 'learning'
    ? State.Learning
    : s === 'review'
      ? State.Review
      : s === 'relearning'
        ? State.Relearning
        : State.New;

const stateToStr = (s: State): StoredCard['state'] =>
  s === State.Learning
    ? 'learning'
    : s === State.Review
      ? 'review'
      : s === State.Relearning
        ? 'relearning'
        : 'new';

export function loadCard(row: StoredCard, now = new Date()): FSRSCard {
  return {
    due: row.due ?? now,
    stability: (row.stability ?? 0) / 1000,
    difficulty: (row.difficulty ?? 0) / 1000,
    elapsed_days: row.elapsedDays ?? 0,
    scheduled_days: row.scheduledDays ?? 0,
    reps: row.reps ?? 0,
    lapses: row.lapses ?? 0,
    state: stateFromStr(row.state),
    last_review: row.lastReview ?? undefined
  };
}

export function grade(
  row: StoredCard,
  rating: 1 | 2 | 3 | 4,
  now = new Date()
): { next: Partial<StoredCard>; log: RecordLogItem['log'] } {
  const current = loadCard(row, now);
  const schedule = fsrs.repeat(current, now);
  const ratingMap = { 1: Rating.Again, 2: Rating.Hard, 3: Rating.Good, 4: Rating.Easy } as const;
  const result = schedule[ratingMap[rating]];

  const next: Partial<StoredCard> = {
    state: stateToStr(result.card.state),
    due: result.card.due,
    stability: Math.round(result.card.stability * 1000),
    difficulty: Math.round(result.card.difficulty * 1000),
    elapsedDays: Math.round(result.card.elapsed_days),
    scheduledDays: Math.round(result.card.scheduled_days),
    reps: result.card.reps,
    lapses: result.card.lapses,
    lastReview: now
  };

  return { next, log: result.log };
}

// Considered "known" for fluency ranking purposes
export function isKnown(row: StoredCard): boolean {
  return row.state === 'review' && (row.stability ?? 0) >= 21 * 1000;
}
