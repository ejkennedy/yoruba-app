# Yorùbá — learn to speak

A web app for learning Yorùbá to fluency. FSRS spaced repetition, native audio, pronunciation grading, youth slang, cultural notes, gamified CEFR-style ranks.

## Stack

Hono · Cloudflare Workers · D1 · R2 · Drizzle · Tailwind v4 + daisyUI · HTMX · ts-fsrs · HuggingFace (MMS TTS/ASR).

## Quickstart

```bash
# 1. Install
bun install

# 2. Create Cloudflare resources (requires wrangler login)
wrangler d1 create yoruba-db-staging       # copy the id into wrangler.jsonc
wrangler r2 bucket create yoruba-audio-staging

# 3. Secrets
wrangler secret put HF_API_KEY             # free token from huggingface.co/settings/tokens
wrangler secret put ANTHROPIC_API_KEY      # optional, only for slang seeding

# 4. Migrate + seed
bun run db:generate
bun run db:migrate                         # local
bun run seed:core                          # pulls Tatoeba + Masakhane → data/core-deck.json
bun run db:seed                            # loads JSON into D1

# 5. Dev
bun run dev                                # http://localhost:8788

# 6. Deploy
bun run deploy:staging
```

See `docs/SETUP.md` for deeper setup + secrets, `CLAUDE.md` for layout + conventions, `/Users/ethan/.claude/plans/whimsical-jumping-babbage.md` for the full product plan.

## Sprints

- [x] **0** — Scaffold (this commit)
- [ ] **1** — Auth, schema, core deck seed
- [ ] **2** — SRS study loop
- [ ] **3** — Audio pipeline
- [ ] **4** — Progress + gamification
- [ ] **5** — Slang + culture content
- [ ] **6** — Pronunciation grading
- [ ] **7** — PWA polish
