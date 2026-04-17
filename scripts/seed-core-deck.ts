/**
 * Pulls Tatoeba Yoruba–English pairs + Masakhane MAFAND-MT parallel corpus,
 * ranks by frequency against Leipzig Corpora Yoruba word list, dedupes,
 * and writes data/core-deck.json.
 *
 * TODO (Sprint 1 completion): wire real ingestion. Current file is a stub that
 * preserves the hand-curated seed in data/core-deck.json. Run this when you
 * want to extend the core deck from external sources.
 *
 * Usage:
 *   bun run scripts/seed-core-deck.ts
 */

console.log('[seed-core-deck] Stub. Current data/core-deck.json is the hand-curated starter.');
console.log(
  'Next: implement Tatoeba dump fetch (https://tatoeba.org/en/downloads), filter lang=yor, join with eng.'
);
