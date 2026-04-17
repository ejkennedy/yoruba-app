import { jsxRenderer, useRequestContext } from 'hono/jsx-renderer';
import { ViteClient, Link } from 'vite-ssr-components/hono';
import { getDb } from '@/db';
import { userProgress } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { rankFor } from '@/lib/fluency';

// Mini profile chip: rank emoji + known-count + streak. Appears in the nav
// when logged in. Cheap query — one row by PK.
async function miniProfile(c: any) {
  const auth = c.get('auth');
  if (!auth?.user) return null;
  try {
    const db = c.get('db') ?? getDb(c.env.DB);
    const p = await db.select().from(userProgress).where(eq(userProgress.userId, auth.user.id)).get();
    const known = p?.knownCount ?? 0;
    return {
      rank: rankFor(known),
      known,
      streak: p?.streakDays ?? 0,
      xp: p?.xp ?? 0
    };
  } catch {
    return null;
  }
}

export const BaseLayout = jsxRenderer(
  async ({ children, title, description }: { children?: any; title?: string; description?: string }) => {
    const c = useRequestContext();
    const auth = c.get('auth');
    const url = new URL(c.req.url);
    const path = url.pathname;
    const t = title ? `${title} • Yorùbá` : 'Yorùbá — learn to speak';
    const d = description || 'Learn Yorùbá to fluency with spaced repetition, native audio, and culture.';

    const profile = auth?.user ? await miniProfile(c) : null;

    const navItem = (href: string, label: string) => {
      const active = path === href || (href !== '/' && path.startsWith(href));
      return (
        <a
          href={href}
          class={`px-3 py-1.5 rounded-field text-sm font-medium transition-colors ${
            active
              ? 'bg-primary/10 text-primary'
              : 'text-base-content/70 hover:text-base-content hover:bg-base-200'
          }`}
        >
          {label}
        </a>
      );
    };

    return (
      <html lang="en" data-theme="yoruba">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <title>{t}</title>
          <meta name="description" content={d} />
          <meta name="theme-color" content="#4338ca" />
          <link rel="manifest" href="/manifest.webmanifest" />
          <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,500&display=swap"
            rel="stylesheet"
          />
          <ViteClient />
          <script src="https://unpkg.com/htmx.org@2.0.4/dist/htmx.min.js"></script>
          <Link href="/src/tailwind.css" rel="stylesheet" />
          <script
            dangerouslySetInnerHTML={{
              __html: `
              // Theme toggle (persists in localStorage)
              (() => {
                const t = localStorage.getItem('theme');
                if (t === 'dark') document.documentElement.dataset.theme = 'yoruba-dark';
              })();
              window.toggleTheme = () => {
                const cur = document.documentElement.dataset.theme;
                const next = cur === 'yoruba-dark' ? 'yoruba' : 'yoruba-dark';
                document.documentElement.dataset.theme = next;
                localStorage.setItem('theme', next === 'yoruba-dark' ? 'dark' : 'light');
              };
            `
            }}
          />
        </head>
        <body class="min-h-screen bg-base-100 text-base-content antialiased grain">
          <header class="sticky top-0 z-20 border-b border-base-300/60 bg-base-100/75 backdrop-blur-md">
            <div class="mx-auto max-w-6xl flex items-center justify-between px-4 h-14">
              <a href="/" class="flex items-center gap-2 font-display font-bold text-xl">
                <span aria-hidden class="inline-grid place-items-center w-8 h-8 rounded-field bg-primary text-primary-content shadow-sm">
                  <span class="text-sm font-bold">Ọ̀</span>
                </span>
                <span>Yorùbá</span>
              </a>

              <nav class="flex items-center gap-1">
                {auth?.user ? (
                  <>
                    <div class="hidden md:flex items-center gap-1">
                      {navItem('/study', 'Study')}
                      {navItem('/speak', 'Speak')}
                      {navItem('/words', 'Words')}
                      {navItem('/decks', 'Decks')}
                      {navItem('/culture', 'Culture')}
                      {navItem('/progress', 'Progress')}
                    </div>

                    {profile && (
                      <a
                        href="/progress"
                        class="hidden sm:flex items-center gap-2 ml-2 pl-3 pr-3 py-1.5 rounded-full bg-base-200 hover:bg-base-300 transition-colors text-xs"
                        title={`${profile.rank.label} · ${profile.known} known · ${profile.xp} XP`}
                      >
                        <span class="text-base leading-none">{profile.rank.emoji}</span>
                        <span class="font-semibold tabular-nums">{profile.known}</span>
                        <span class="text-base-content/40">·</span>
                        <span class="tabular-nums">🔥 {profile.streak}</span>
                      </a>
                    )}

                    <button
                      class="btn btn-ghost btn-sm btn-circle ml-1"
                      onclick="toggleTheme()"
                      aria-label="Toggle theme"
                    >
                      <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                        <path d="M10 3a1 1 0 01.993.883L11 4v1a1 1 0 01-1.993.117L9 5V4a1 1 0 011-1zm5.657 2.343a1 1 0 01.083 1.32l-.083.094-.707.707a1 1 0 01-1.497-1.32l.083-.094.707-.707a1 1 0 011.414 0zM10 6a4 4 0 110 8 4 4 0 010-8zm-5.657.343l.094.083.707.707a1 1 0 01-1.32 1.497l-.094-.083-.707-.707A1 1 0 014.343 6.343zM17 10a1 1 0 01.117 1.993L17 12h-1a1 1 0 01-.117-1.993L16 10h1zm-13 0a1 1 0 01.117 1.993L4 12H3a1 1 0 01-.117-1.993L3 10h1zm10.243 5.243l.094.083.707.707a1 1 0 01-1.32 1.497l-.094-.083-.707-.707a1 1 0 011.32-1.497zm-8.486 0a1 1 0 011.497 1.32l-.083.094-.707.707a1 1 0 01-1.497-1.32l.083-.094.707-.707zM10 15a1 1 0 01.993.883L11 16v1a1 1 0 01-1.993.117L9 17v-1a1 1 0 011-1z"/>
                      </svg>
                    </button>

                    <form method="post" action="/auth/logout" class="inline">
                      <button class="btn btn-ghost btn-sm ml-1" title="Sign out" aria-label="Sign out">
                        <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                          <path fill-rule="evenodd" d="M3 4.75A2.75 2.75 0 015.75 2h4.5a2.75 2.75 0 012.75 2.75v1a.75.75 0 01-1.5 0v-1c0-.69-.56-1.25-1.25-1.25h-4.5c-.69 0-1.25.56-1.25 1.25v10.5c0 .69.56 1.25 1.25 1.25h4.5c.69 0 1.25-.56 1.25-1.25v-1a.75.75 0 011.5 0v1A2.75 2.75 0 0110.25 18h-4.5A2.75 2.75 0 013 15.25V4.75z" clip-rule="evenodd"/>
                          <path fill-rule="evenodd" d="M12.97 6.97a.75.75 0 011.06 0l2.5 2.5a.75.75 0 010 1.06l-2.5 2.5a.75.75 0 11-1.06-1.06l1.22-1.22H7.75a.75.75 0 010-1.5h6.44L12.97 8.03a.75.75 0 010-1.06z" clip-rule="evenodd"/>
                        </svg>
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <a href="/auth/login" class="btn btn-ghost btn-sm">Log in</a>
                    <a href="/auth/signup" class="btn btn-primary btn-sm ml-1 glow-primary">
                      Start free
                    </a>
                    <button
                      class="btn btn-ghost btn-sm btn-circle ml-1"
                      onclick="toggleTheme()"
                      aria-label="Toggle theme"
                    >
                      <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                        <path d="M10 2a8 8 0 108 8 6 6 0 01-8-8z"/>
                      </svg>
                    </button>
                  </>
                )}
              </nav>
            </div>

            {auth?.user && (
              <div class="md:hidden border-t border-base-300/60 overflow-x-auto">
                <div class="flex items-center gap-1 px-4 py-2 whitespace-nowrap">
                  {navItem('/study', 'Study')}
                  {navItem('/speak', 'Speak')}
                  {navItem('/words', 'Words')}
                  {navItem('/decks', 'Decks')}
                  {navItem('/culture', 'Culture')}
                  {navItem('/progress', 'Progress')}
                </div>
              </div>
            )}
          </header>

          <main class="mx-auto max-w-6xl px-4 py-10 relative">{children}</main>

          <footer class="mx-auto max-w-6xl px-4 py-10 text-xs text-base-content/50 flex justify-between">
            <span>Made with ♥ for Yorùbá learners</span>
            <span>
              <a href="/culture" class="hover:underline">Culture</a>
              <span class="mx-2">·</span>
              <a href="/about" class="hover:underline">About</a>
            </span>
          </footer>
        </body>
      </html>
    );
  }
);
