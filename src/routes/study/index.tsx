import { Context } from 'hono';
import { dueCount, newAvailableCount } from '@/lib/session-builder';

export const onRequestGet = async (c: Context) => {
  const auth = c.get('auth');
  if (!auth?.user) return c.redirect('/auth/login');
  const db = c.get('db');
  const [due, newAvail] = await Promise.all([dueCount(db, auth.user.id), newAvailableCount(db, auth.user.id)]);

  return c.render(
    <section class="max-w-xl mx-auto space-y-6">
      <header>
        <h1 class="font-display text-3xl">Study</h1>
        <p class="text-base-content/70">
          <span class="badge badge-primary">{due}</span> due · {newAvail} new phrases available
        </p>
      </header>
      <form method="get" action="/study/session" class="card bg-base-200">
        <div class="card-body space-y-4">
          <div>
            <label class="label">Mode</label>
            <div class="join w-full">
              <input class="join-item btn flex-1" type="radio" name="mode" value="mix" aria-label="Mix" checked />
              <input class="join-item btn flex-1" type="radio" name="mode" value="review" aria-label="Review" />
              <input class="join-item btn flex-1" type="radio" name="mode" value="new" aria-label="New only" />
            </div>
          </div>
          <div>
            <label class="label">Session size</label>
            <div class="join w-full">
              <input class="join-item btn flex-1" type="radio" name="size" value="10" aria-label="10" />
              <input class="join-item btn flex-1" type="radio" name="size" value="25" aria-label="25" checked />
              <input class="join-item btn flex-1" type="radio" name="size" value="50" aria-label="50" />
            </div>
          </div>
          <button class="btn btn-primary btn-lg">Begin</button>
        </div>
      </form>
    </section>,
    { title: 'Study' }
  );
};
