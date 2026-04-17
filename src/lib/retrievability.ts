/**
 * FSRS retrievability — the model's probability that you'd recall this card
 * *right now* if asked. This is the "confidence" bar Hack Chinese renders next
 * to every word.
 *
 * FSRS-5 forgetting curve:
 *   R(t, S) = (1 + t / (9 * S))^(-1)
 *
 *   t = elapsed days since last review
 *   S = stability (days of memory half-life, roughly)
 *
 * Our DB stores stability ×1000 for integer precision, so we divide back.
 */

import type { cards as CardsTable } from '@/db/schema';

type CardRow = typeof CardsTable.$inferSelect;

export function retrievability(card: CardRow, now: Date = new Date()): number {
  if (card.state === 'new') return 0;
  const stabilityDays = (card.stability ?? 0) / 1000;
  if (stabilityDays <= 0) return 0;
  const last = card.lastReview ?? card.createdAt ?? now;
  const elapsedDays = Math.max(0, (now.getTime() - last.getTime()) / 86_400_000);
  return 1 / (1 + elapsedDays / (9 * stabilityDays));
}

export function daysUntilDue(card: CardRow, now: Date = new Date()): number {
  if (!card.due) return 0;
  return (card.due.getTime() - now.getTime()) / 86_400_000;
}

/**
 * Human-readable "next review in …" string. Matches the Hack Chinese vibe:
 *   "now", "in 3h", "in 2d", "in 3wk", "in 4mo", "in 2y"
 */
export function formatInterval(days: number): string {
  if (days <= 0) return 'now';
  if (days < 1 / 24) return 'in <1m';
  if (days < 1) {
    const h = Math.round(days * 24);
    return `in ${h}h`;
  }
  if (days < 14) return `in ${Math.round(days)}d`;
  if (days < 60) return `in ${Math.round(days / 7)}wk`;
  if (days < 365) return `in ${Math.round(days / 30)}mo`;
  return `in ${(days / 365).toFixed(1)}y`;
}

export type ConfidenceTier = 'weak' | 'building' | 'strong' | 'mature';

export function tier(r: number, stabilityDays: number): ConfidenceTier {
  if (r < 0.6) return 'weak';
  if (stabilityDays >= 180) return 'mature';
  if (stabilityDays >= 21) return 'strong';
  return 'building';
}

export const TIER_COLOR: Record<ConfidenceTier, string> = {
  weak: 'progress-error',
  building: 'progress-warning',
  strong: 'progress-success',
  mature: 'progress-primary'
};

export const TIER_LABEL: Record<ConfidenceTier, string> = {
  weak: 'Weak',
  building: 'Building',
  strong: 'Strong',
  mature: 'Mature'
};
