/**
 * Builds the session queue based on the user's mode selection.
 * Mirrors Hack Chinese's "new / review / mix" switch.
 */

import { and, asc, eq, isNull, lte, sql } from 'drizzle-orm';
import type { DB } from '@/db';
import { cards, decks, phrases, userDecks } from '@/db/schema';

export type StudyMode = 'new' | 'review' | 'mix';

export interface BuildOpts {
  userId: string;
  mode: StudyMode;
  size: number; // total target phrases
  newRatio?: number; // for 'mix', default 0.3
  newCap?: number; // absolute new-card-per-day cap
}

export interface QueueItem {
  phraseId: string;
  yoruba: string;
  english: string;
  audioKey: string | null;
  deckSlug: string;
  cardId: string | null; // null when not yet a card
  kind: 'new' | 'review';
}

export async function buildQueue(db: DB, opts: BuildOpts): Promise<QueueItem[]> {
  const { userId, mode, size, newRatio = 0.3, newCap = 15 } = opts;

  const newTarget =
    mode === 'new'
      ? Math.min(size, newCap)
      : mode === 'review'
        ? 0
        : Math.min(Math.round(size * newRatio), newCap);
  const reviewTarget = size - newTarget;

  const newRows =
    newTarget > 0
      ? await db
          .select({
            phraseId: phrases.id,
            yoruba: phrases.yoruba,
            english: phrases.english,
            audioKey: phrases.audioKey,
            deckSlug: decks.slug,
            freq: phrases.frequencyRank,
            priority: decks.priority
          })
          .from(phrases)
          .innerJoin(decks, eq(phrases.deckId, decks.id))
          .innerJoin(
            userDecks,
            and(eq(userDecks.deckId, decks.id), eq(userDecks.userId, userId), eq(userDecks.active, true))
          )
          .leftJoin(cards, and(eq(cards.phraseId, phrases.id), eq(cards.userId, userId)))
          .where(isNull(cards.id))
          .orderBy(asc(decks.priority), asc(phrases.frequencyRank))
          .limit(newTarget)
      : [];

  const reviewRows =
    reviewTarget > 0
      ? await db
          .select({
            cardId: cards.id,
            phraseId: phrases.id,
            yoruba: phrases.yoruba,
            english: phrases.english,
            audioKey: phrases.audioKey,
            deckSlug: decks.slug,
            due: cards.due
          })
          .from(cards)
          .innerJoin(phrases, eq(phrases.id, cards.phraseId))
          .innerJoin(decks, eq(decks.id, phrases.deckId))
          .where(and(eq(cards.userId, userId), eq(cards.suspended, false), lte(cards.due, new Date())))
          .orderBy(asc(cards.due))
          .limit(reviewTarget)
      : [];

  const out: QueueItem[] = [];
  // interleave when mix
  if (mode === 'mix' && newRows.length && reviewRows.length) {
    const ratio = Math.max(newRows.length / (newRows.length + reviewRows.length), 0.01);
    let nI = 0,
      rI = 0;
    while (nI < newRows.length || rI < reviewRows.length) {
      const takeNew =
        nI < newRows.length && (rI >= reviewRows.length || Math.random() < ratio);
      if (takeNew) {
        const r = newRows[nI++];
        out.push({
          phraseId: r.phraseId,
          yoruba: r.yoruba,
          english: r.english,
          audioKey: r.audioKey,
          deckSlug: r.deckSlug,
          cardId: null,
          kind: 'new'
        });
      } else {
        const r = reviewRows[rI++];
        out.push({
          phraseId: r.phraseId,
          yoruba: r.yoruba,
          english: r.english,
          audioKey: r.audioKey,
          deckSlug: r.deckSlug,
          cardId: r.cardId,
          kind: 'review'
        });
      }
    }
  } else {
    for (const r of newRows)
      out.push({
        phraseId: r.phraseId,
        yoruba: r.yoruba,
        english: r.english,
        audioKey: r.audioKey,
        deckSlug: r.deckSlug,
        cardId: null,
        kind: 'new'
      });
    for (const r of reviewRows)
      out.push({
        phraseId: r.phraseId,
        yoruba: r.yoruba,
        english: r.english,
        audioKey: r.audioKey,
        deckSlug: r.deckSlug,
        cardId: r.cardId,
        kind: 'review'
      });
  }

  return out;
}

export async function dueCount(db: DB, userId: string): Promise<number> {
  const r = await db
    .select({ c: sql<number>`count(*)` })
    .from(cards)
    .where(and(eq(cards.userId, userId), eq(cards.suspended, false), lte(cards.due, new Date())))
    .get();
  return r?.c ?? 0;
}

export async function newAvailableCount(db: DB, userId: string): Promise<number> {
  const r = await db
    .select({ c: sql<number>`count(*)` })
    .from(phrases)
    .innerJoin(decks, eq(phrases.deckId, decks.id))
    .innerJoin(
      userDecks,
      and(eq(userDecks.deckId, decks.id), eq(userDecks.userId, userId), eq(userDecks.active, true))
    )
    .leftJoin(cards, and(eq(cards.phraseId, phrases.id), eq(cards.userId, userId)))
    .where(isNull(cards.id))
    .get();
  return r?.c ?? 0;
}
