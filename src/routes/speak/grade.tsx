import { Context } from 'hono';
import { eq } from 'drizzle-orm';
import { phrases, speakAttempts } from '@/db/schema';
import { transcribeYoruba, score } from '@/lib/asr-grade';

export const onRequestPost = async (c: Context) => {
  const auth = c.get('auth');
  if (!auth?.user) return c.text('Unauthorized', 401);
  const db = c.get('db');
  const env = c.env as { HF_API_KEY?: string; AUDIO?: R2Bucket };

  const form = await c.req.formData();
  const phraseId = String(form.get('phraseId'));
  const durationMs = parseInt(String(form.get('durationMs') || '0'), 10);
  const audio = form.get('audio') as File | null;
  if (!audio) return c.text('No audio', 400);

  const phrase = await db.select().from(phrases).where(eq(phrases.id, phraseId)).get();
  if (!phrase) return c.text('Phrase not found', 404);

  const ab = await audio.arrayBuffer();

  // Save user recording to R2 for later review
  const key = `speak/${auth.user.id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.webm`;
  try {
    await env.AUDIO?.put(key, ab, { httpMetadata: { contentType: 'audio/webm' } });
  } catch (e) {
    console.warn('R2 put failed:', e);
  }

  // Transcribe + score
  let transcript = '';
  let breakdown;
  try {
    if (!env.HF_API_KEY) throw new Error('HF_API_KEY not set');
    transcript = await transcribeYoruba(env.HF_API_KEY, ab);
    breakdown = score(phrase.yoruba, transcript, durationMs);
  } catch (e: any) {
    return c.html(
      <div class="alert alert-warning mt-3">
        ASR unavailable: {e.message}. Self-review below.
      </div>
    );
  }

  await db.insert(speakAttempts).values({
    id: crypto.randomUUID(),
    userId: auth.user.id,
    phraseId,
    audioKey: key,
    transcript,
    score: breakdown.total
  });

  const scoreColor =
    breakdown.total >= 85 ? 'text-success' : breakdown.total >= 65 ? 'text-warning' : 'text-error';

  return c.html(
    <div class="mt-3 space-y-3">
      <div class="card bg-base-100 border border-base-300">
        <div class="card-body">
          <div class="flex items-baseline justify-between">
            <div>
              <div class="text-sm text-base-content/60">Score</div>
              <div class={`text-5xl font-bold ${scoreColor}`}>{breakdown.total}</div>
            </div>
            <div class="text-xs text-base-content/60 space-y-1 text-right">
              <div>Edit: {Math.round(breakdown.edit * 100)}%</div>
              <div>Tones: {Math.round(breakdown.tone * 100)}%</div>
              <div>Length: {Math.round(breakdown.lengthOk * 100)}%</div>
            </div>
          </div>
          <div class="mt-3 text-sm">
            <div class="text-base-content/60">Heard:</div>
            <div lang="yo" class="yo text-lg">{transcript || '(nothing)'}</div>
            <div class="text-base-content/60 mt-2">Target:</div>
            <div lang="yo" class="yo text-lg">{phrase.yoruba}</div>
          </div>
          <div class="text-xs text-base-content/50 mt-2">
            ASR is imperfect for Yorùbá tones — trust your ear. Compare A/B and decide.
          </div>
        </div>
      </div>
    </div>
  );
};
