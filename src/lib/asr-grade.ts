/**
 * Pronunciation grading via HF MMS ASR for Yoruba.
 * HF deprecated the legacy api-inference.huggingface.co in late 2025.
 * New endpoint: router.huggingface.co/hf-inference/models/<id>
 * Requires HF_API_KEY secret.
 *
 * If this fails in your region/model-availability, swap to an equivalent
 * ASR provider (Groq/Deepgram/OpenAI Whisper) — the interface here is the
 * only thing that needs to change.
 */

export async function transcribeYoruba(apiKey: string, audio: ArrayBuffer): Promise<string> {
  const r = await fetch(
    'https://router.huggingface.co/hf-inference/models/facebook/mms-1b-all',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'audio/webm',
        'x-target-lang': 'yor'
      },
      body: audio
    }
  );
  if (!r.ok) {
    throw new Error(`HF ASR failed: ${r.status} ${await r.text()}`);
  }
  const j = (await r.json()) as { text?: string } | Array<{ text?: string }>;
  return Array.isArray(j) ? (j[0]?.text ?? '') : (j.text ?? '');
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
      dp[j] = Math.min(
        dp[j] + 1,
        dp[j - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      prev = tmp;
    }
  }
  const dist = dp[n];
  return 1 - dist / Math.max(m, n);
}

// Tone mark retention — compares presence of combining diacritics
function toneScore(target: string, got: string): number {
  const marks = (s: string) => (s.normalize('NFD').match(/[\u0300\u0301\u0323\u0303\u0308]/gu) || []).length;
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
  const lengthOk = audioMs == null ? 1 : audioMs > 300 && audioMs < 8000 ? 1 : audioMs > 100 ? 0.5 : 0;
  // Weighted 70 / 20 / 10
  const total = Math.round(edit * 70 + tone * 20 + lengthOk * 10);
  return { transcript, total, edit, tone, lengthOk };
}
