# Setup

## Prerequisites

- Bun (`curl -fsSL https://bun.sh/install | bash`)
- Cloudflare account with Wrangler authenticated (`wrangler login`)
- HuggingFace account — [create a free API token](https://huggingface.co/settings/tokens) (read access is enough)
- (Optional) Anthropic API key — only needed if you run `seed:slang`

## Cloudflare resources

```bash
# D1 database (staging)
wrangler d1 create yoruba-db-staging
# → copy the database_id into wrangler.jsonc

# R2 bucket for audio
wrangler r2 bucket create yoruba-audio-staging
# then enable public access on the bucket so the app can play audio directly:
#   Dashboard → R2 → yoruba-audio-staging → Settings → Public access → r2.dev URL → Enable
# paste the pub-*.r2.dev URL into AUDIO_PUBLIC_BASE in wrangler.jsonc

# Prod (do the same, but with 'yoruba-db' and 'yoruba-audio')
wrangler d1 create yoruba-db
wrangler r2 bucket create yoruba-audio
# → copy those ids into wrangler.prod.jsonc
```

## Secrets

```bash
wrangler secret put HF_API_KEY
wrangler secret put ANTHROPIC_API_KEY   # optional
```

Local dev uses `.dev.vars`:

```bash
cp .env.example .dev.vars
# edit .dev.vars with your keys
```

## Database

```bash
bun run db:generate            # regenerate migrations from src/db/schema.ts
bun run db:migrate             # apply to local D1
bun run db:migrate:staging     # apply to remote staging
bun run db:migrate:prod        # apply to prod
```

## Seeding content

```bash
bun run seed:core       # pulls Tatoeba + Masakhane, writes data/core-deck.json
bun run seed:slang      # Anthropic-generated Lagos slang (needs ANTHROPIC_API_KEY)
bun run seed:culture    # culture notes
bun run seed:audio      # runs MMS-TTS locally via Python, uploads .ogg to R2 (needs uv + ffmpeg)
bun run db:seed         # loads all of data/*.json into D1
```

Audio gen uses MMS-TTS locally (no API key, runs offline after first-time ~300MB model download) and requires:
- `uv` (Python package manager; `brew install uv` or `curl -LsSf https://astral.sh/uv/install.sh | sh`)
- `ffmpeg` on PATH: `brew install ffmpeg`

The previous HuggingFace Inference API approach was removed — HF deprecated the free serverless endpoint for most models in late 2025.

## Running

```bash
bun run dev           # Vite dev server, http://localhost:8788
bun run build
bun run deploy:staging
```
