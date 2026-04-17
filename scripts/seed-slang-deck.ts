/**
 * Generates Lagos Gen-Z Yoruba slang deck via Anthropic Claude.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... bun run scripts/seed-slang-deck.ts
 *
 * Output appended/merged into data/slang-deck.json. Every entry starts
 * needsReview=true — flip to false after you've manually approved.
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = join(ROOT, 'data/slang-deck.json');

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('ANTHROPIC_API_KEY required.');
  process.exit(1);
}

const client = new Anthropic({ apiKey });

const prompt = `You are a Yorùbá language coach focused on Lagos Gen-Z (18–30) register.
Produce a JSON array of 40 authentic slang expressions young Lagosians use today,
mixing pure Yorùbá, Yorùbá-Pidgin code-switch, and Yorùbá-English. Avoid touristy phrases.

Schema per item:
{
  "yoruba": string,        // correctly diacritised
  "english": string,       // idiomatic gloss
  "tags": string[],        // e.g. ["slang","shade","reaction","pidgin","social"]
  "note": string,          // 1-sentence context/etymology, WHEN to use it
  "register": "friends" | "anyone" | "careful"  // social safety
}

Return ONLY the JSON array. No prose, no markdown fences.`;

const res = await client.messages.create({
  model: 'claude-opus-4-6',
  max_tokens: 4096,
  messages: [{ role: 'user', content: prompt }]
});

const text = res.content.map((c) => (c.type === 'text' ? c.text : '')).join('');
const jsonStart = text.indexOf('[');
const jsonEnd = text.lastIndexOf(']');
const raw = text.slice(jsonStart, jsonEnd + 1);
const items = JSON.parse(raw) as Array<{
  yoruba: string;
  english: string;
  tags: string[];
  note: string;
  register: string;
}>;

// Merge into existing slang deck
const existing = JSON.parse(readFileSync(OUT, 'utf8')) as {
  deck: any;
  phrases: any[];
};
const have = new Set(existing.phrases.map((p) => p.yoruba));
const additions = items
  .filter((i) => !have.has(i.yoruba))
  .map((i) => ({
    yoruba: i.yoruba,
    english: i.english,
    tags: [...new Set([...(i.tags || []), 'slang', `register:${i.register}`])],
    note: i.note,
    needsReview: true
  }));

existing.phrases.push(...additions);
writeFileSync(OUT, JSON.stringify(existing, null, 2) + '\n', 'utf8');
console.log(`Added ${additions.length} slang entries to ${OUT} (needsReview=true).`);
