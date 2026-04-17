import { Context } from 'hono';
import { dueCount, newAvailableCount } from '@/lib/session-builder';

export const onRequestGet = async (c: Context) => {
  const auth = c.get('auth');
  if (!auth?.user) return c.redirect('/auth/login');
  const db = c.get('db');
  const [due, newAvail] = await Promise.all([
    dueCount(db, auth.user.id),
    newAvailableCount(db, auth.user.id)
  ]);

  return c.render(
    <section class="max-w-2xl mx-auto space-y-8">
      <header>
        <h1 class="font-display text-4xl font-bold">Study</h1>
        <p class="text-base-content/70 mt-1">
          <span class="text-primary font-semibold tabular-nums">{due}</span> due · {' '}
          <span class="tabular-nums">{newAvail}</span> new phrases available
        </p>
      </header>

      <form method="get" action="/study/session" class="space-y-6">
        <div>
          <div class="text-xs uppercase tracking-widest text-base-content/60 mb-3">Mode</div>
          <div class="grid grid-cols-3 gap-2">
            {[
              { v: 'mix', label: 'Mix', desc: 'Reviews + some new' },
              { v: 'review', label: 'Review', desc: 'Only due cards' },
              { v: 'new', label: 'New', desc: 'Learn fresh phrases' }
            ].map((m, i) => (
              <label class="cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  value={m.v}
                  checked={i === 0}
                  class="peer sr-only"
                />
                <div class="card bg-base-200 peer-checked:bg-primary peer-checked:text-primary-content transition-colors">
                  <div class="card-body p-4 text-center">
                    <div class="font-display text-xl font-semibold">{m.label}</div>
                    <div class="text-xs opacity-70">{m.desc}</div>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <div class="text-xs uppercase tracking-widest text-base-content/60 mb-3">Session size</div>
          <div class="grid grid-cols-4 gap-2">
            {['10', '25', '50', '100'].map((n, i) => (
              <label class="cursor-pointer">
                <input
                  type="radio"
                  name="size"
                  value={n}
                  checked={i === 1}
                  class="peer sr-only"
                />
                <div class="card bg-base-200 peer-checked:bg-primary peer-checked:text-primary-content transition-colors">
                  <div class="card-body p-3 text-center">
                    <div class="font-display text-2xl font-semibold tabular-nums">{n}</div>
                    <div class="text-xs opacity-70">cards</div>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <button class="btn btn-primary btn-lg w-full glow-primary gap-3">
          Begin session
          <svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
          </svg>
        </button>
      </form>

      <div class="text-center text-xs text-base-content/50">
        Tip: press <kbd class="kbd kbd-xs">Space</kbd> to reveal,{' '}
        <kbd class="kbd kbd-xs">1</kbd>–<kbd class="kbd kbd-xs">4</kbd> to grade,{' '}
        <kbd class="kbd kbd-xs">P</kbd> to replay audio.
      </div>
    </section>,
    { title: 'Study' }
  );
};
