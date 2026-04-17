import { Context } from 'hono';
import { eq } from 'drizzle-orm';
import { users } from '@/db/schema';
import { verifyPassword, createSession } from '@/middleware/auth';

export const onRequestGet = (c: Context) => {
  const auth = c.get('auth');
  if (auth?.user) return c.redirect('/');

  return c.render(
    <div class="max-w-sm mx-auto mt-10 card bg-base-200">
      <div class="card-body">
        <h1 class="font-display text-2xl">Welcome back</h1>
        <form method="post" action="/auth/login" class="space-y-3 mt-2">
          <label class="input w-full">
            <span class="label">Email</span>
            <input type="email" name="email" required autocomplete="email" />
          </label>
          <label class="input w-full">
            <span class="label">Password</span>
            <input type="password" name="password" required autocomplete="current-password" />
          </label>
          <div id="login-error" class="text-sm text-error"></div>
          <button class="btn btn-primary w-full">Log in</button>
        </form>
        <p class="text-sm text-base-content/70 mt-3">
          No account? <a href="/auth/signup" class="link">Sign up</a>
        </p>
      </div>
    </div>,
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
    const msg = <p class="text-sm text-error">Invalid email or password</p>;
    if (c.req.header('HX-Request')) return c.html(msg);
    return c.redirect('/auth/login?error=invalid');
  }

  await createSession(c, user.id);
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

  if (c.req.header('HX-Request')) return c.html('', 200, { 'HX-Redirect': '/' });
  return c.redirect('/');
};
