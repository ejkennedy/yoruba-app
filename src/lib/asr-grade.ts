/**
 * Pronunciation grading via Cloudflare Workers AI Whisper.
 *
 * We use @cf/openai/whisper-large-v3-turbo which runs in the same Worker
 * runtime — no external API call, no HF deprecation pain. Yorùbá is one of
 * Whisper's 99 supported languages (`yo`). Accuracy on tonal diacritics is
 * imperfect (less so than MMS), which is why the final "score" is a hint —
 * the dual-player self-review beside it is the authoritative signal.
 */

export interface AiBinding {
  run: (
    model: string,
    inputs: { audio: string; language?: string; task?: 'transcribe' | 'translate'; vad_filter?: boolean }
  ) => Promise<{ text: string; transcription_info?: { language?: string; language_probability?: number } }>;
}

function toBase64(buf: ArrayBuffer): string {
  // Chunked to avoid blowing the call stack on multi-MB audio blobs.
  const bytes = new Uint8Array(buf);
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK) as unknown as number[]);
  }
  return btoa(binary);
}

export async function transcribeYoruba(ai: AiBinding, audio: ArrayBuffer): Promise<string> {
  const res = await ai.run('@cf/openai/whisper-large-v3-turbo', {
    audio: toBase64(audio),
    language: 'yo',
    task: 'transcribe',
    vad_filter: true
  });
  return (res.text ?? '').trim();
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^\p{L}\p{M}\s]/gu, '')
    .trim()
    .replace(/\s+/g, ' ');

// Fast Levenshtein ratio 0..1
function levRatio(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const m = a.length,
    n = b.length;
  const dp: number[] = new Array(n + 1).fill(0);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return 1 - dp[n] / Math.max(m, n);
}

// Tone mark retention — compares presence of combining diacritics
function toneScore(target: string, got: string): number {
  const marks = (s: string) =>
    (s.normalize('NFD').match(/[\u0300\u0301\u0323\u0303\u0308]/gu) || []).length;
  const t = marks(target);
  if (t === 0) return 1;
  const g = marks(got);
  return Math.max(0, 1 - Math.abs(t - g) / t);
}

export interface ScoreBreakdown {
  transcript: string;
  total: number;
  edit: number;
  tone: number;
  lengthOk: number;
}

export function score(target: string, transcript: string, audioMs?: number): ScoreBreakdown {
  const t = normalize(target);
  const g = normalize(transcript);
  const edit = levRatio(t, g);
  const tone = toneScore(target, transcript);
  const lengthOk =
    audioMs == null ? 1 : audioMs > 300 && audioMs < 8000 ? 1 : audioMs > 100 ? 0.5 : 0;
  // Weighted 70 / 20 / 10
  const total = Math.round(edit * 70 + tone * 20 + lengthOk * 10);
  return { transcript, total, edit, tone, lengthOk };
}
