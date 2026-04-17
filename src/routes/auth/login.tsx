import { Context } from 'hono';
import { eq } from 'drizzle-orm';
import { users } from '@/db/schema';
import { verifyPassword, createSession } from '@/middleware/auth';

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
      <h1 class="font-display text-2xl font-bold">Welcome back</h1>
      <p class="text-sm text-base-content/60">Pick up where you left off.</p>
      {error === 'invalid' && (
        <div class="alert alert-error text-sm mt-3 py-2">Invalid email or password.</div>
      )}
      <form method="post" action="/auth/login" class="space-y-3 mt-4">
        <label class="input input-bordered w-full flex items-center gap-2">
          <svg class="w-4 h-4 opacity-60" viewBox="0 0 20 20" fill="currentColor"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/></svg>
          <input type="email" name="email" required autocomplete="email" placeholder="Email" class="grow" />
        </label>
        <label class="input input-bordered w-full flex items-center gap-2">
          <svg class="w-4 h-4 opacity-60" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clip-rule="evenodd"/></svg>
          <input type="password" name="password" required autocomplete="current-password" placeholder="Password" class="grow" />
        </label>
        <button class="btn btn-primary w-full glow-primary">Log in</button>
      </form>
      <p class="text-sm text-center text-base-content/70 mt-4">
        No account? <a href="/auth/signup" class="link link-primary font-medium">Sign up</a>
      </p>
    </Shell>,
    { title: 'Log in' }
  );
};

export const onRequestPost = async (c: Context) => {
  const db = c.get('db');
  const form = await c.req.formData();
  const email = String(form.get('email') || '').toLowerCase().trim();
  const password = String(form.get('password') || '');

  const user = await db.select().from(users).where(eq(users.email, email)).get();
  const ok = user && (await verifyPassword(password, user.passwordHash));

  if (!ok || !user) {
    const msg = <div class="alert alert-error text-sm py-2">Invalid email or password</div>;
    if (c.req.header('HX-Request')) return c.html(msg);
    return c.redirect('/auth/login?error=invalid');
  }

  await createSession(c, user.id);
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

  if (c.req.header('HX-Request')) return c.html('', 200, { 'HX-Redirect': '/' });
  return c.redirect('/');
};
