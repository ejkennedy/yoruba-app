import { Context } from 'hono';
import { eq } from 'drizzle-orm';
import { users, userProgress, userDecks, decks } from '@/db/schema';
import { hashPassword, createSession } from '@/middleware/auth';

const Shell = ({ children }: { children: any }) => (
  <div class="max-w-md mx-auto pt-10">
    <div class="text-center mb-8">
      <div lang="yo" class="yo font-display text-5xl font-bold text-primary">Yorùbá</div>
      <div class="text-sm text-base-content/60 mt-2">Learn to speak — one session at a time.</div>
    </div>
    <div class="card bg-base-200">
      <div class="card-body">{children}</div>
    </div>
  </div>
);

export const onRequestGet = (c: Context) => {
  const auth = c.get('auth');
  if (auth?.user) return c.redirect('/');
  const error = c.req.query('error');

  return c.render(
    <Shell>
      <h1 class="font-display text-2xl font-bold">Start learning</h1>
      <p class="text-sm text-base-content/60">Free. No credit card. No ads.</p>
      {error === 'exists' && (
        <div class="alert alert-warning text-sm mt-3 py-2">That email is already registered — try logging in.</div>
      )}
      {error === 'invalid' && (
        <div class="alert alert-error text-sm mt-3 py-2">Please enter a valid email and a password of at least 8 characters.</div>
      )}
      <form method="post" action="/auth/signup" class="space-y-3 mt-4">
        <label class="input input-bordered w-full flex items-center gap-2">
          <svg class="w-4 h-4 opacity-60" viewBox="0 0 20 20" fill="currentColor"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/></svg>
          <input name="displayName" required autocomplete="name" placeholder="What should we call you?" class="grow" />
        </label>
        <label class="input input-bordered w-full flex items-center gap-2">
          <svg class="w-4 h-4 opacity-60" viewBox="0 0 20 20" fill="currentColor"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/></svg>
          <input type="email" name="email" required autocomplete="email" placeholder="Email" class="grow" />
        </label>
        <label class="input input-bordered w-full flex items-center gap-2">
          <svg class="w-4 h-4 opacity-60" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clip-rule="evenodd"/></svg>
          <input type="password" name="password" minlength={8} required autocomplete="new-password" placeholder="Password (8+ chars)" class="grow" />
        </label>
        <button class="btn btn-primary w-full glow-primary">Create account</button>
      </form>
      <p class="text-sm text-center text-base-content/70 mt-4">
        Already a learner? <a href="/auth/login" class="link link-primary font-medium">Log in</a>
      </p>
    </Shell>,
    { title: 'Sign up' }
  );
};

export const onRequestPost = async (c: Context) => {
  const db = c.get('db');
  const form = await c.req.formData();
  const email = String(form.get('email') || '').toLowerCase().trim();
  const displayName = String(form.get('displayName') || '').trim() || null;
  const password = String(form.get('password') || '');

  if (!email || password.length < 8) return c.redirect('/auth/signup?error=invalid');

  const existing = await db.select().from(users).where(eq(users.email, email)).get();
  if (existing) return c.redirect('/auth/signup?error=exists');

  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(password);

  await db.insert(users).values({ id, email, passwordHash, displayName });
  await db.insert(userProgress).values({ userId: id });

  const built = await db.select().from(decks).where(eq(decks.isBuiltIn, true));
  if (built.length) {
    await db.insert(userDecks).values(built.map((d) => ({ userId: id, deckId: d.id, active: true })));
  }

  await createSession(c, id);
  if (c.req.header('HX-Request')) return c.html('', 200, { 'HX-Redirect': '/' });
  return c.redirect('/');
};
