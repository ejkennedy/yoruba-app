export interface Rank {
  slug: string;
  label: string;
  emoji: string;
  min: number;
  max: number; // exclusive; Infinity for final
}

export const RANKS: Rank[] = [
  { slug: 'omo-tuntun', label: 'Ọmọ Tuntun', emoji: '🌱', min: 0, max: 100 },
  { slug: 'akekoo', label: 'Akẹkọọ', emoji: '🐣', min: 100, max: 500 },
  { slug: 'oloro', label: 'Ọlọrọ', emoji: '🦜', min: 500, max: 1200 },
  { slug: 'ayo', label: 'Ayọ́', emoji: '🥁', min: 1200, max: 2500 },
  { slug: 'oba', label: 'Ọba', emoji: '🦁', min: 2500, max: 5000 },
  { slug: 'ori-ola', label: 'Orí Ọlá', emoji: '👑', min: 5000, max: Number.POSITIVE_INFINITY }
];

export function rankFor(knownCount: number): Rank {
  return RANKS.find((r) => knownCount >= r.min && knownCount < r.max) ?? RANKS[RANKS.length - 1];
}

export function progressToNextRank(knownCount: number): { current: Rank; next: Rank | null; pct: number; remaining: number } {
  const current = rankFor(knownCount);
  const idx = RANKS.indexOf(current);
  const next = idx + 1 < RANKS.length ? RANKS[idx + 1] : null;
  if (!next) return { current, next: null, pct: 1, remaining: 0 };
  const span = next.min - current.min;
  const into = knownCount - current.min;
  return { current, next, pct: Math.min(1, into / span), remaining: next.min - knownCount };
}

// XP per rating
export const XP_REWARD: Record<1 | 2 | 3 | 4, number> = { 1: 1, 2: 3, 3: 5, 4: 7 };
