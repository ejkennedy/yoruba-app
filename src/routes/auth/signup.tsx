import { Context } from 'hono';
import { eq } from 'drizzle-orm';
import { users, userProgress, userDecks, decks } from '@/db/schema';
import { hashPassword, createSession } from '@/middleware/auth';

export const onRequestGet = (c: Context) => {
  const auth = c.get('auth');
  if (auth?.user) return c.redirect('/');

  return c.render(
    <div class="max-w-sm mx-auto mt-10 card bg-base-200">
      <div class="card-body">
        <h1 class="font-display text-2xl">Start learning Yorùbá</h1>
        <form method="post" action="/auth/signup" class="space-y-3 mt-2">
          <label class="input w-full">
            <span class="label">Name</span>
            <input name="displayName" required autocomplete="name" />
          </label>
          <label class="input w-full">
            <span class="label">Email</span>
            <input type="email" name="email" required autocomplete="email" />
          </label>
          <label class="input w-full">
            <span class="label">Password</span>
            <input type="password" name="password" minlength={8} required autocomplete="new-password" />
          </label>
          <button class="btn btn-primary w-full">Create account</button>
        </form>
        <p class="text-sm text-base-content/70 mt-3">
          Already a learner? <a href="/auth/login" class="link">Log in</a>
        </p>
      </div>
    </div>,
    { title: 'Sign up' }
  );
};

export const onRequestPost = async (c: Context) => {
  const db = c.get('db');
  const form = await c.req.formData();
  const email = String(form.get('email') || '').toLowerCase().trim();
  const displayName = String(form.get('displayName') || '').trim() || null;
  const password = String(form.get('password') || '');

  if (!email || password.length < 8) {
    return c.redirect('/auth/signup?error=invalid');
  }

  const existing = await db.select().from(users).where(eq(users.email, email)).get();
  if (existing) {
    return c.redirect('/auth/signup?error=exists');
  }

  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(password);

  await db.insert(users).values({ id, email, passwordHash, displayName });
  await db.insert(userProgress).values({ userId: id });

  // Auto-activate all built-in decks
  const built = await db.select().from(decks).where(eq(decks.isBuiltIn, true));
  if (built.length) {
    await db
      .insert(userDecks)
      .values(built.map((d) => ({ userId: id, deckId: d.id, active: true })));
  }

  await createSession(c, id);

  if (c.req.header('HX-Request')) return c.html('', 200, { 'HX-Redirect': '/' });
  return c.redirect('/');
};
