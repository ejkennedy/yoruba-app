/**
 * Loads data/*.json into D1.
 *
 * Usage:
 *   bun run scripts/run-seed.ts                # local D1
 *   bun run scripts/run-seed.ts --remote       # remote staging D1
 *   bun run scripts/run-seed.ts --prod         # remote prod D1
 *
 * Implementation: generates a SQL file at `scripts/_seed.sql`, then invokes
 * `wrangler d1 execute`. Idempotent — uses INSERT OR IGNORE by slug for decks
 * and by (deck, yoruba) for phrases.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

type DeckMeta = {
  slug: string;
  name: string;
  description: string;
  kind: 'core' | 'slang' | 'culture' | 'custom';
  priority: number;
};
type PhraseSeed = {
  yoruba: string;
  english: string;
  tags?: string[];
  freq?: number;
  note?: string;
};
type CultureNote = {
  slug: string;
  title: string;
  body: string;
  summary?: string;
  relatedPhrases?: string[];
};

const ROOT = new URL('..', import.meta.url).pathname;
const DATA = join(ROOT, 'data');
const OUT = join(ROOT, 'scripts/_seed.sql');

const args = new Set(process.argv.slice(2));
const target = args.has('--prod')
  ? { db: 'yoruba-db', flags: '--config ./wrangler.prod.jsonc --remote' }
  : args.has('--remote')
    ? { db: 'yoruba-db-staging', flags: '--remote' }
    : { db: 'yoruba-db-staging', flags: '--local' };

// ---------- helpers ----------
const esc = (v: unknown) => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? '1' : '0';
  return `'${String(v).replace(/'/g, "''")}'`;
};
const deckId = (slug: string) => `deck_${slug}`;
const phraseId = (deckSlug: string, yoruba: string) =>
  `ph_${deckSlug}_${createHash('sha1').update(yoruba).digest('hex').slice(0, 10)}`;
const noteId = (slug: string) => `note_${slug}`;

// ---------- build SQL ----------
const stmts: string[] = [];

function loadDeck(path: string) {
  if (!existsSync(path)) return null;
  const j = JSON.parse(readFileSync(path, 'utf8')) as { deck: DeckMeta; phrases: PhraseSeed[] };
  const d = j.deck;
  stmts.push(
    `INSERT OR IGNORE INTO decks (id, slug, name, description, kind, is_built_in, priority) ` +
      `VALUES (${esc(deckId(d.slug))}, ${esc(d.slug)}, ${esc(d.name)}, ${esc(d.description)}, ${esc(d.kind)}, 1, ${d.priority});`
  );
  for (const p of j.phrases) {
    const id = phraseId(d.slug, p.yoruba);
    const tags = JSON.stringify(p.tags ?? []);
    stmts.push(
      `INSERT OR IGNORE INTO phrases (id, deck_id, yoruba, english, tags, frequency_rank, audio_source) ` +
        `VALUES (${esc(id)}, ${esc(deckId(d.slug))}, ${esc(p.yoruba)}, ${esc(p.english)}, ${esc(tags)}, ${p.freq != null ? p.freq : 'NULL'}, 'none');`
    );
    if (p.note) {
      stmts.push(
        `UPDATE phrases SET context_english = ${esc(p.note)} WHERE id = ${esc(id)};`
      );
    }
  }
  return d;
}

function loadCulture(path: string) {
  if (!existsSync(path)) return;
  const notes = JSON.parse(readFileSync(path, 'utf8')) as CultureNote[];
  for (const n of notes) {
    const related = JSON.stringify(n.relatedPhrases ?? []);
    stmts.push(
      `INSERT OR IGNORE INTO culture_notes (id, slug, title, summary, body, related_phrase_ids) ` +
        `VALUES (${esc(noteId(n.slug))}, ${esc(n.slug)}, ${esc(n.title)}, ${esc(n.summary ?? null)}, ${esc(n.body)}, ${esc(related)});`
    );
  }
}

loadDeck(join(DATA, 'core-deck.json'));
loadDeck(join(DATA, 'slang-deck.json'));
loadCulture(join(DATA, 'culture-notes.json'));

writeFileSync(OUT, stmts.join('\n') + '\n', 'utf8');
console.log(`Wrote ${stmts.length} statements → ${OUT}`);

// ---------- apply ----------
const cmd = `wrangler d1 execute ${target.db} ${target.flags} --file=${OUT}`;
console.log(`\n$ ${cmd}\n`);
execSync(cmd, { stdio: 'inherit', cwd: ROOT });
console.log('\n✅ Seed applied.');
