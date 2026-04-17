/**
 * After `generate-audio.ts` uploads to R2, this script writes the audio_key +
 * audio_source='tts' fields onto matching phrase rows in D1 via a SQL patch.
 *
 * Usage:
 *   bun run scripts/link-audio.ts              # local
 *   bun run scripts/link-audio.ts --remote     # staging
 *   bun run scripts/link-audio.ts --prod
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = join(ROOT, 'scripts/_link-audio.sql');

const args = new Set(process.argv.slice(2));
const target = args.has('--prod')
  ? { db: 'yoruba-db', flags: '--config ./wrangler.prod.jsonc --remote' }
  : args.has('--remote')
    ? { db: 'yoruba-db-staging', flags: '--remote' }
    : { db: 'yoruba-db-staging', flags: '--local' };

const files = ['core-deck.json', 'slang-deck.json'];
const stmts: string[] = [];

for (const f of files) {
  const p = join(ROOT, 'data', f);
  if (!existsSync(p)) continue;
  const j = JSON.parse(readFileSync(p, 'utf8'));
  for (const ph of j.phrases as { yoruba: string }[]) {
    const key = `audio/phrase/${createHash('sha256').update(ph.yoruba).digest('hex').slice(0, 24)}.ogg`;
    const y = String(ph.yoruba).replace(/'/g, "''");
    stmts.push(
      `UPDATE phrases SET audio_key='${key}', audio_source='tts' WHERE yoruba='${y}' AND (audio_source IS NULL OR audio_source='none');`
    );
  }
}

writeFileSync(OUT, stmts.join('\n') + '\n');
console.log(`Wrote ${stmts.length} UPDATE statements → ${OUT}`);
execSync(`wrangler d1 execute ${target.db} ${target.flags} --file=${OUT}`, {
  stdio: 'inherit',
  cwd: ROOT
});
console.log('✅ Audio keys linked.');
