import { Context } from 'hono';
import { eq } from 'drizzle-orm';
import { userProgress } from '@/db/schema';
import { dueCount, newAvailableCount } from '@/lib/session-builder';
import { progressToNextRank } from '@/lib/fluency';

export const onRequestGet = async (c: Context) => {
  const auth = c.get('auth');

  // ---------- Logged-in dashboard ----------
  if (auth?.user) {
    const db = c.get('db');
    const [p, due, newAvail] = await Promise.all([
      db.select().from(userProgress).where(eq(userProgress.userId, auth.user.id)).get(),
      dueCount(db, auth.user.id),
      newAvailableCount(db, auth.user.id)
    ]);
    const known = p?.knownCount ?? 0;
    const { current, next, pct, remaining } = progressToNextRank(known);
    const greet =
      new Date().getHours() < 12 ? 'Ẹ káàárọ̀' : new Date().getHours() < 17 ? 'Ẹ káàsán' : 'Ẹ kúurọ̀lẹ́';

    return c.render(
      <div class="space-y-10">
        {/* Greeting + rank */}
        <section class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p class="text-sm text-base-content/60">{greet},</p>
            <h1 class="font-display text-4xl sm:text-5xl font-bold leading-tight">
              {auth.user.displayName || auth.user.email.split('@')[0]}
            </h1>
          </div>
          <a href="/progress" class="flex items-center gap-3 bg-base-200 rounded-box px-4 py-3 hover:bg-base-300 transition">
            <span class="text-3xl">{current.emoji}</span>
            <div>
              <div class="text-xs text-base-content/60">Rank</div>
              <div class="font-display text-lg leading-tight">{current.label}</div>
              {next && (
                <div class="text-xs text-base-content/60">{remaining} to {next.label}</div>
              )}
            </div>
          </a>
        </section>

        {/* Main CTA */}
        <section class="grid lg:grid-cols-3 gap-4">
          <a
            href={`/study/session?mode=mix&size=${due + newAvail === 0 ? 10 : Math.min(25, due + Math.min(15, newAvail))}`}
            class="lg:col-span-2 card bg-primary text-primary-content glow-primary hover:scale-[1.01] transition-transform"
          >
            <div class="card-body">
              <div class="flex items-center justify-between gap-4">
                <div>
                  <div class="uppercase text-xs tracking-widest opacity-80">Today's session</div>
                  <div class="font-display text-4xl font-bold mt-2">Study now</div>
                  <div class="opacity-90 mt-1">
                    {due > 0
                      ? `${due} card${due === 1 ? '' : 's'} due${newAvail > 0 ? ` · ${newAvail} new ready` : ''}`
                      : newAvail > 0
                        ? `No reviews due — ${newAvail} new phrases waiting`
                        : 'All caught up. Try a fresh review for practice.'}
                  </div>
                </div>
                <svg class="w-16 h-16 opacity-80 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M5 12h14M13 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
            </div>
          </a>

          <div class="card bg-base-200">
            <div class="card-body">
              <div class="text-xs text-base-content/60 uppercase tracking-widest">Streak</div>
              <div class="font-display text-4xl font-bold mt-1">
                {p?.streakDays ?? 0} <span class="text-3xl">🔥</span>
              </div>
              <div class="text-xs text-base-content/60">
                Best: {p?.bestStreak ?? 0} · XP: {(p?.xp ?? 0).toLocaleString()}
              </div>
              <div class="mt-auto pt-4">
                <a href="/study?mode=mix" class="btn btn-ghost btn-sm w-full">Custom session →</a>
              </div>
            </div>
          </div>
        </section>

        {/* Stat tiles */}
        <section class="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Known words', value: known, hint: 'mature memory' },
            { label: 'Due now', value: due, hint: 'ready to review' },
            { label: 'New available', value: newAvail, hint: 'across active decks' },
            { label: 'Reviews logged', value: p?.totalReviews ?? 0, hint: 'all-time' }
          ].map((s) => (
            <div class="card bg-base-200">
              <div class="card-body p-4">
                <div class="text-xs text-base-content/60 uppercase tracking-widest">{s.label}</div>
                <div class="font-display text-3xl font-semibold mt-1 tabular-nums">
                  {Number(s.value).toLocaleString()}
                </div>
                <div class="text-xs text-base-content/50 mt-1">{s.hint}</div>
              </div>
            </div>
          ))}
        </section>

        {/* Rank progress */}
        {next && (
          <section class="card bg-base-200">
            <div class="card-body">
              <div class="flex items-end justify-between">
                <div>
                  <div class="text-xs text-base-content/60 uppercase tracking-widest">Next rank</div>
                  <div class="font-display text-xl mt-1">
                    {current.emoji} {current.label}
                    <span class="text-base-content/40 mx-2">→</span>
                    {next.emoji} {next.label}
                  </div>
                </div>
                <div class="text-right tabular-nums">
                  <div class="text-2xl font-bold">{Math.round(pct * 100)}%</div>
                  <div class="text-xs text-base-content/60">{remaining} words to go</div>
                </div>
              </div>
              <progress class="progress progress-primary mt-3 h-3" value={pct * 100} max={100}></progress>
            </div>
          </section>
        )}

        {/* Secondary actions */}
        <section class="grid md:grid-cols-3 gap-3">
          {[
            { href: '/speak', title: 'Practise speaking', body: 'Record, compare to native, get a score.', emoji: '🎙' },
            { href: '/words', title: 'Your vocabulary', body: `${known} words with confidence & review times.`, emoji: '📚' },
            { href: '/culture', title: 'Culture notes', body: 'Greetings, tones, dialects, proverbs.', emoji: '📜' }
          ].map((x) => (
            <a href={x.href} class="card bg-base-200 hover:bg-base-300 transition-colors">
              <div class="card-body">
                <div class="text-2xl">{x.emoji}</div>
                <div class="font-display text-lg font-semibold mt-1">{x.title}</div>
                <div class="text-sm text-base-content/70">{x.body}</div>
              </div>
            </a>
          ))}
        </section>
      </div>,
      { title: 'Home' }
    );
  }

  // ---------- Logged-out landing ----------
  return c.render(
    <div class="space-y-24 py-10">
      <section class="text-center max-w-3xl mx-auto">
        <span class="badge badge-ghost mb-6">Free · open source · made with ♥</span>
        <h1 class="font-display text-5xl sm:text-7xl font-bold leading-[1.05]">
          Speak{' '}
          <span lang="yo" class="yo text-primary italic">Yorùbá</span>.
          <br />
          <span class="text-base-content/50">For real.</span>
        </h1>
        <p class="mt-8 text-lg sm:text-xl text-base-content/70 max-w-2xl mx-auto">
          Frequency-ordered phrases, native-quality audio, spaced repetition, and the slang
          you won't find in textbooks. Built for people who want to sound like Lagos — not a
          phrasebook.
        </p>
        <div class="mt-10 flex gap-3 justify-center">
          <a class="btn btn-primary btn-lg glow-primary" href="/auth/signup">
            Start free
          </a>
          <a class="btn btn-ghost btn-lg" href="/auth/login">
            I have an account
          </a>
        </div>
        <div class="mt-8 text-xs text-base-content/50 tabular-nums">
          630 phrases · 3 culture notes · CEFR-style ranks
        </div>
      </section>

      <section class="grid md:grid-cols-3 gap-4">
        {[
          {
            t: 'Listen first',
            d: 'Yorùbá is tonal. Every card plays native audio before you even see the English — so your ear does the work.',
            emoji: '👂'
          },
          {
            t: 'Lifestyle SRS',
            d: 'FSRS-5 scheduling, the same engine powering modern Anki. Study new, review, or mix — every session ends on time.',
            emoji: '♾️'
          },
          {
            t: 'Culture + slang',
            d: 'Greetings etiquette, the respect register, proverbs, and the Gen-Z Lagos slang your friends actually use at owámbẹ̀.',
            emoji: '🥁'
          }
        ].map((f) => (
          <div class="card bg-base-200">
            <div class="card-body">
              <div class="text-3xl">{f.emoji}</div>
              <h3 class="font-display text-xl font-semibold mt-2">{f.t}</h3>
              <p class="text-sm text-base-content/70 mt-1">{f.d}</p>
            </div>
          </div>
        ))}
      </section>

      <section class="text-center">
        <h2 class="font-display text-3xl sm:text-4xl font-bold">How far can you go?</h2>
        <p class="text-base-content/70 mt-2 max-w-lg mx-auto">
          Six ranks, mapped to real vocabulary milestones. Every session moves the needle.
        </p>
        <div class="mt-8 flex flex-wrap justify-center gap-3">
          {[
            { e: '🌱', n: 'Ọmọ Tuntun', w: '0' },
            { e: '🐣', n: 'Akẹkọọ', w: '100' },
            { e: '🦜', n: 'Ọlọrọ', w: '500' },
            { e: '🥁', n: 'Ayọ́', w: '1,200' },
            { e: '🦁', n: 'Ọba', w: '2,500' },
            { e: '👑', n: 'Orí Ọlá', w: '5,000+' }
          ].map((r) => (
            <div class="card bg-base-200 w-36">
              <div class="card-body items-center text-center p-4">
                <div class="text-3xl">{r.e}</div>
                <div class="font-display text-sm font-semibold mt-1">{r.n}</div>
                <div class="text-xs text-base-content/60">{r.w} words</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>,
    { title: 'Learn Yorùbá' }
  );
};
