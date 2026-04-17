/**
 * Pronunciation grading via Gemini multimodal audio comparison.
 *
 * Why not just Whisper? Whisper transcribes then we diff strings — a lossy
 * pipeline where tone diacritics are the first thing discarded. Gemini can
 * *listen* to both clips side-by-side (native reference + learner attempt)
 * and judge pitch contour, segment accuracy, and rhythm holistically.
 *
 * Audio is sent inline as base64. Both clips are short (typically 1–5 s), so
 * we stay well under Gemini's per-request size limits. Gemini 2.0 Flash is
 * fast (~2 s latency) and has a free-tier generous enough for personal use.
 */

export interface GeminiScore {
  overall: number;  // 0–100 holistic
  tones: number;    // 0–100 pitch contour accuracy
  segments: number; // 0–100 consonant/vowel accuracy (ẹ vs e, ṣ vs s …)
  rhythm: number;   // 0–100 timing & pacing
  feedback: string; // actionable coaching in 1–2 sentences
  transcript?: string; // best-guess transcription of what learner said
}

const MODEL = 'gemini-2.0-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, i + CHUNK) as unknown as number[]
    );
  }
  return btoa(binary);
}

export interface CompareArgs {
  apiKey: string;
  targetYoruba: string;
  targetEnglish?: string;
  targetAudio: ArrayBuffer;
  targetMime: string;
  userAudio: ArrayBuffer;
  userMime: string;
}

export async function compareAudioWithGemini(args: CompareArgs): Promise<GeminiScore> {
  const prompt = `You are a strict but encouraging Yorùbá pronunciation coach.

Two audio clips follow.
  AUDIO 1 — native reference pronunciation of this phrase: "${args.targetYoruba}"${
    args.targetEnglish ? ` (means: ${args.targetEnglish})` : ''
  }
  AUDIO 2 — a learner's attempt at the same phrase.

Compare AUDIO 2 against AUDIO 1 and score 0–100 on each dimension:
  • overall  — holistic closeness to a native speaker
  • tones    — Yorùbá is tonal. Did the learner land each syllable's high / mid / low pitch? This is the most important dimension for Yorùbá.
  • segments — consonant/vowel accuracy (ẹ vs e, ọ vs o, ṣ vs s, nasal quality, subdots)
  • rhythm   — timing, pacing, syllable weight, connected speech

Also give:
  • feedback — 1–2 plain-English sentences of actionable coaching. Name specific syllables if you can.
  • transcript — your best-guess transcription of what the learner actually said (may differ from target).

Be honest. If AUDIO 2 is clearly a different phrase, silent, or unintelligible, say so and score overall low. If it's native-level, give a 95+.`;

  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { inline_data: { mime_type: args.targetMime, data: toBase64(args.targetAudio) } },
          { inline_data: { mime_type: args.userMime, data: toBase64(args.userAudio) } }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          overall: { type: 'integer' },
          tones: { type: 'integer' },
          segments: { type: 'integer' },
          rhythm: { type: 'integer' },
          feedback: { type: 'string' },
          transcript: { type: 'string' }
        },
        required: ['overall', 'tones', 'segments', 'rhythm', 'feedback']
      },
      temperature: 0.2
    }
  };

  const r = await fetch(`${ENDPOINT}?key=${encodeURIComponent(args.apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!r.ok) {
    throw new Error(`Gemini ${r.status}: ${(await r.text()).slice(0, 240)}`);
  }
  const j = (await r.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = j.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no text');

  const parsed = JSON.parse(text) as GeminiScore;
  // Clamp to 0–100 and round
  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
  return {
    overall: clamp(parsed.overall),
    tones: clamp(parsed.tones),
    segments: clamp(parsed.segments),
    rhythm: clamp(parsed.rhythm),
    feedback: String(parsed.feedback ?? ''),
    transcript: parsed.transcript ? String(parsed.transcript) : undefined
  };
}
