/**
 * Build a playback URL for a phrase's R2 audio. We prefer a public r2.dev
 * base URL (configured per-env in wrangler.jsonc vars), falling back to a
 * Worker-proxied stream via `/api/audio/:key` if the bucket isn't public.
 */

export function audioUrl(env: { AUDIO_PUBLIC_BASE?: string }, audioKey: string | null) {
  if (!audioKey) return null;
  if (env.AUDIO_PUBLIC_BASE && !env.AUDIO_PUBLIC_BASE.includes('<ACCOUNT_HASH>')) {
    return `${env.AUDIO_PUBLIC_BASE.replace(/\/$/, '')}/${audioKey}`;
  }
  return `/api/audio/${encodeURIComponent(audioKey)}`;
}
