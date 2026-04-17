import { Context } from 'hono';
import { and, eq, isNotNull, sql } from 'drizzle-orm';
import { phrases, cards } from '@/db/schema';
import { audioUrl } from '@/lib/audio-url';

export const onRequestGet = async (c: Context) => {
  const auth = c.get('auth');
  if (!auth?.user) return c.redirect('/auth/login');
  const db = c.get('db');

  // Prefer phrases the user is actively learning, else random with audio
  const phraseIdQ = c.req.query('phraseId');
  let phrase;
  if (phraseIdQ) {
    phrase = await db.select().from(phrases).where(eq(phrases.id, phraseIdQ)).get();
  } else {
    phrase = await db
      .select({ p: phrases })
      .from(phrases)
      .innerJoin(cards, and(eq(cards.phraseId, phrases.id), eq(cards.userId, auth.user.id)))
      .where(isNotNull(phrases.audioKey))
      .orderBy(sql`random()`)
      .limit(1)
      .get();
    phrase = phrase ? (phrase as any).p : undefined;
    if (!phrase) {
      phrase = await db
        .select()
        .from(phrases)
        .where(isNotNull(phrases.audioKey))
        .orderBy(sql`random()`)
        .limit(1)
        .get();
    }
  }

  if (!phrase) {
    return c.render(
      <div class="max-w-lg mx-auto text-center py-12">
        <p>No phrases with audio yet. Run <code>bun run seed:audio</code> first.</p>
      </div>
    );
  }

  const nativeUrl = audioUrl(c.env as any, phrase.audioKey);

  return c.render(
    <section class="max-w-xl mx-auto space-y-6">
      <header>
        <h1 class="font-display text-3xl">Say it</h1>
        <p class="text-base-content/70">Record yourself. Compare A/B with native audio. Score for the vibes.</p>
      </header>

      <div class="card bg-base-200">
        <div class="card-body space-y-3">
          <div class="text-sm text-base-content/60">Target phrase</div>
          <div class="yo text-4xl font-display" lang="yo">{phrase.yoruba}</div>
          <div class="text-base-content/80">{phrase.english}</div>
          <div class="flex gap-2 mt-2">
            <button class="btn btn-ghost btn-sm" onclick={`new Audio('${nativeUrl}').play()`}>
              ▶ Native
            </button>
            <a class="btn btn-ghost btn-sm" href="/speak">↻ Another phrase</a>
          </div>
        </div>
      </div>

      <div id="recorder" class="card bg-base-200">
        <div class="card-body space-y-3">
          <div class="flex gap-2">
            <button id="rec-btn" class="btn btn-primary">● Record</button>
            <button id="stop-btn" class="btn btn-ghost" disabled>■ Stop</button>
            <span id="rec-status" class="self-center text-sm text-base-content/60">Ready.</span>
          </div>
          <audio id="playback" controls class="w-full hidden"></audio>
          <div id="score-out"></div>
        </div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
          (() => {
            const rec = document.getElementById('rec-btn');
            const stop = document.getElementById('stop-btn');
            const status = document.getElementById('rec-status');
            const playback = document.getElementById('playback');
            const out = document.getElementById('score-out');
            let mediaRecorder, chunks = [], startTs = 0;
            rec.onclick = async () => {
              try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
                chunks = [];
                mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
                mediaRecorder.onstop = async () => {
                  const blob = new Blob(chunks, { type: 'audio/webm' });
                  const dur = Date.now() - startTs;
                  playback.src = URL.createObjectURL(blob);
                  playback.classList.remove('hidden');
                  status.textContent = 'Scoring…';
                  const fd = new FormData();
                  fd.append('audio', blob, 'recording.webm');
                  fd.append('phraseId', ${JSON.stringify(phrase.id)});
                  fd.append('durationMs', String(dur));
                  const r = await fetch('/speak/grade', { method: 'POST', body: fd });
                  out.innerHTML = await r.text();
                  status.textContent = 'Done.';
                  stream.getTracks().forEach(t => t.stop());
                };
                mediaRecorder.start();
                startTs = Date.now();
                status.textContent = 'Recording…';
                rec.disabled = true; stop.disabled = false;
              } catch (e) {
                status.textContent = 'Mic denied: ' + e.message;
              }
            };
            stop.onclick = () => {
              mediaRecorder?.stop();
              rec.disabled = false; stop.disabled = true;
            };
          })();
        `
        }}
      />
    </section>,
    { title: 'Speak' }
  );
};
