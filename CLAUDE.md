# CLAUDE.md

Guidance for Claude Code working in this repo.

## Project

Yorùbá learning web app. Frequency-ordered phrases, FSRS spaced repetition, native audio, pronunciation grading, gamified fluency ranking, Lagos Gen-Z slang + culture notes.

Master plan: `/Users/ethan/.claude/plans/whimsical-jumping-babbage.md`

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono 4 + `hono-router` (auto-generated routes)
- **Build**: Vite + `@cloudflare/vite-plugin`
- **Language**: TypeScript, JSX via `hono/jsx`
- **DB**: Cloudflare D1 (SQLite) via Drizzle ORM
- **Storage**: Cloudflare R2 for audio blobs (binding: `AUDIO`)
- **Frontend**: Tailwind v4 + daisyUI 5 + HTMX
- **SRS**: `ts-fsrs`
- **AI**: HuggingFace Inference API (MMS-TTS + MMS ASR, free tier), optional Anthropic for slang gen
- **Package manager**: Bun

## Dev Commands

```bash
bun install
bun run dev                 # vite on :8788
bun run build
bun run deploy:staging      # wrangler deploy (uses wrangler.jsonc)
bun run deploy:prod         # uses wrangler.prod.jsonc
bun run cf-typegen          # regenerate CloudflareBindings types
bun run db:generate         # drizzle-kit: generate SQL from schema.ts
bun run db:migrate          # apply to local D1
bun run db:migrate:staging  # apply to remote staging D1
bun run routes              # regenerate src/router.ts from src/routes/
bun run test
```

## Layout

- `src/index.tsx` — Hono app entry, wires middleware + routes.
- `src/middleware/` — auth (cookie sessions), db, route gating.
- `src/routes/` — route modules. Each exports `onRequestGet` / `onRequestPost`.
- `src/layouts/BaseLayout.tsx` — global JSX wrapper (nav + head).
- `src/db/schema.ts` — Drizzle schema (users, decks, phrases, cards, reviews, etc.).
- `src/lib/` — FSRS wrapper, session builder, fluency ranking, audio-url, ASR grading.
- `src/components/` — JSX UI blocks (ReviewPanel, CardFace, RankBadge, …).
- `scripts/` — one-off ingest + audio generation scripts (run with `bun run scripts/…`).
- `data/` — generated seed JSON (checked in for reproducibility).
- `drizzle/` — generated SQL migrations.

## Conventions

- Route files are `.tsx` if they render JSX, `.ts` for pure API endpoints.
- Prefer HTMX fragment responses for any action that replaces in-page state (review loop, speak grading). Fall back to full-page redirects for non-HTMX requests.
- Every Yorùbá string in HTML wraps in `lang="yo"` (and often `class="yo"` for Fraunces serif).
- Tailwind theme is `yoruba` — indigo primary, gold secondary, ivory surfaces.
- Audio R2 key convention: `audio/phrase/{sha256(yoruba).slice(0,24)}.ogg`.
- Card `stability` and `difficulty` are stored as integers × 1000 to keep D1 types simple.

## Don't

- Don't add static file routes — files under `public/` are served automatically.
- Don't couple new endpoints to Durable Objects unless explicitly needed.
- Don't hit HF inference at runtime for TTS — pre-generate and upload to R2 at seed time.

## Secrets

Set with `wrangler secret put <NAME>`:
- `HF_API_KEY` — required for audio gen + pronunciation grading.
- `ANTHROPIC_API_KEY` — optional, only for slang-deck seeding.
- `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` — only if using presigned R2 URLs (otherwise `AUDIO_PUBLIC_BASE` + public bucket).

Local: copy `.env.example` → `.dev.vars`.
