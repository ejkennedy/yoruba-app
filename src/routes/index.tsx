import { Context } from 'hono';

export const onRequestGet = (c: Context) => {
  const auth = c.get('auth');

  if (auth?.user) {
    return c.render(
      <section class="space-y-8">
        <div class="card bg-base-200 shadow-sm">
          <div class="card-body">
            <h1 class="font-display text-3xl">
              Ẹ káàárọ̀, <span class="text-primary">{auth.user.displayName || auth.user.email}</span>
            </h1>
            <p class="text-base-content/70">
              Welcome back. Your dashboard with streak, rank, and due cards ships in Sprint 4.
            </p>
            <div class="card-actions mt-4">
              <a class="btn btn-primary" href="/study">Start studying</a>
              <a class="btn btn-ghost" href="/decks">Browse decks</a>
            </div>
          </div>
        </div>
      </section>,
      { title: 'Home' }
    );
  }

  return c.render(
    <section class="space-y-10">
      <div class="hero py-12">
        <div class="hero-content text-center max-w-2xl">
          <div>
            <h1 class="font-display text-5xl font-bold leading-tight">
              Speak <span lang="yo" class="yo text-primary">Yorùbá</span>.
              <br />
              For real.
            </h1>
            <p class="mt-6 text-base-content/70 text-lg">
              Frequency-ordered phrases, native audio, spaced repetition, and the slang you won't
              find in textbooks. Learn like Lagos.
            </p>
            <div class="mt-8 flex gap-3 justify-center">
              <a class="btn btn-primary btn-lg" href="/auth/signup">Start free</a>
              <a class="btn btn-ghost btn-lg" href="/auth/login">I have an account</a>
            </div>
          </div>
        </div>
      </div>

      <div class="grid md:grid-cols-3 gap-4">
        {[
          { t: 'Listen first', d: 'Tonal language → audio is everything. Native pronunciations on every card.' },
          { t: 'Lifestyle SRS', d: 'FSRS-5 scheduling. Study new, review, or mix — you decide.' },
          { t: 'Culture + slang', d: 'Greetings, proverbs, and Gen-Z Lagos slang. Not just tourist phrases.' }
        ].map((f) => (
          <div class="card bg-base-200">
            <div class="card-body">
              <h3 class="card-title">{f.t}</h3>
              <p class="text-sm text-base-content/70">{f.d}</p>
            </div>
          </div>
        ))}
      </div>
    </section>,
    { title: 'Learn Yorùbá' }
  );
};
