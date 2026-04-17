import { Context } from 'hono';
import { eq } from 'drizzle-orm';
import { phrases, speakAttempts } from '@/db/schema';
import { compareAudioWithGemini, type GeminiScore } from '@/lib/gemini-compare';

const scoreColor = (n: number) =>
  n >= 85 ? 'text-success' : n >= 65 ? 'text-warning' : 'text-error';

const Bar = ({ label, value }: { label: string; value: number }) => (
  <div>
    <div class="flex items-baseline justify-between text-xs">
      <span class="text-base-content/70 font-medium">{label}</span>
      <span class={`tabular-nums ${scoreColor(value)}`}>{value}</span>
    </div>
    <progress
      class={`progress h-2 ${value >= 85 ? 'progress-success' : value >= 65 ? 'progress-warning' : 'progress-error'}`}
      value={value}
      max={100}
    />
  </div>
);

export const onRequestPost = async (c: Context) => {
  const auth = c.get('auth');
  if (!auth?.user) return c.text('Unauthorized', 401);
  const db = c.get('db');
  const env = c.env as { AUDIO?: R2Bucket; GEMINI_API_KEY?: string };

  const form = await c.req.formData();
  const phraseId = String(form.get('phraseId'));
  const audio = form.get('audio') as File | null;
  if (!audio) return c.text('No audio', 400);

  const phrase = await db.select().from(phrases).where(eq(phrases.id, phraseId)).get();
  if (!phrase) return c.text('Phrase not found', 404);

  const userAudio = await audio.arrayBuffer();
  const userMime = audio.type || 'audio/webm';

  // Persist user recording to R2 for later review
  const userKey = `speak/${auth.user.id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.webm`;
  try {
    await env.AUDIO?.put(userKey, userAudio, { httpMetadata: { contentType: userMime } });
  } catch (e) {
    console.warn('R2 put failed:', e);
  }

  // Gemini needs both clips. Fetch native reference from R2.
  let result: GeminiScore | null = null;
  let err: string | null = null;

  try {
    if (!env.GEMINI_API_KEY) throw new Error('Set GEMINI_API_KEY with `wrangler secret put GEMINI_API_KEY`');
    if (!phrase.audioKey) throw new Error('This phrase has no native audio yet. Run `bun run seed:audio`.');
    if (!env.AUDIO) throw new Error('R2 AUDIO binding missing');

    const targetObj = await env.AUDIO.get(phrase.audioKey);
    if (!targetObj) throw new Error(`Native audio missing in R2: ${phrase.audioKey}`);
    const targetAudio = await targetObj.arrayBuffer();
    const targetMime = targetObj.httpMetadata?.contentType || 'audio/ogg';

    result = await compareAudioWithGemini({
      apiKey: env.GEMINI_API_KEY,
      targetYoruba: phrase.yoruba,
      targetEnglish: phrase.english,
      targetAudio,
      targetMime,
      userAudio,
      userMime
    });
  } catch (e: any) {
    err = e.message || String(e);
  }

  if (err || !result) {
    return c.html(
      <div class="alert alert-warning mt-3 text-sm">
        Gemini unavailable — {err}. Self-review below.
      </div>
    );
  }

  await db.insert(speakAttempts).values({
    id: crypto.randomUUID(),
    userId: auth.user.id,
    phraseId,
    audioKey: userKey,
    transcript: result.transcript ?? null,
    score: result.overall
  });

  return c.html(
    <div class="mt-4 space-y-4 animate-[slide-up_220ms_ease-out]">
      <div class="card bg-base-100 border border-base-300">
        <div class="card-body">
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="text-xs uppercase tracking-widest text-base-content/60">Score</div>
              <div class={`font-display text-6xl font-bold leading-none ${scoreColor(result.overall)}`}>
                {result.overall}
              </div>
              <div class="text-xs text-base-content/50 mt-1">
                Gemini graded ear-to-ear vs. the native clip.
              </div>
            </div>
            <div class="flex-1 max-w-xs space-y-2">
              <Bar label="Tones" value={result.tones} />
              <Bar label="Segments" value={result.segments} />
              <Bar label="Rhythm" value={result.rhythm} />
            </div>
          </div>

          <div class="divider my-2"></div>

          <div>
            <div class="text-xs uppercase tracking-widest text-base-content/60 mb-1">Coaching</div>
            <p class="text-sm leading-relaxed">{result.feedback}</p>
          </div>

          {result.transcript && (
            <div class="text-xs mt-3">
              <div class="text-base-content/60">Gemini heard:</div>
              <div lang="yo" class="yo text-lg mt-0.5">{result.transcript}</div>
              <div class="text-base-content/60 mt-2">Target:</div>
              <div lang="yo" class="yo text-lg mt-0.5">{phrase.yoruba}</div>
            </div>
          )}

          <div class="text-[11px] text-base-content/50 mt-3">
            Tones are the #1 thing to fix for Yorùbá. Replay the native clip until your ear matches it, then retry.
          </div>
        </div>
      </div>
    </div>
  );
};
