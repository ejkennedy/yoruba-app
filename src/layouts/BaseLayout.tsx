import { jsxRenderer, useRequestContext } from 'hono/jsx-renderer';
import { ViteClient, Link } from 'vite-ssr-components/hono';

export const BaseLayout = jsxRenderer(
  ({ children, title, description }: { children?: any; title?: string; description?: string }) => {
    const c = useRequestContext();
    const auth = c.get('auth');
    const url = new URL(c.req.url);
    const t = title ? `${title} • Yorùbá` : 'Yorùbá — learn to speak';
    const d = description || 'Learn Yorùbá to fluency with spaced repetition, native audio, and culture.';

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
            href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Fraunces:ital,wght@0,400;0,600;0,700;1,500&display=swap"
            rel="stylesheet"
          />
          <ViteClient />
          <script src="https://unpkg.com/htmx.org@2.0.4/dist/htmx.min.js"></script>
          <Link href="/src/tailwind.css" rel="stylesheet" />
        </head>
        <body class="min-h-screen bg-base-100 text-base-content antialiased">
          <header class="border-b border-base-300/60 bg-base-100/80 backdrop-blur sticky top-0 z-10">
            <div class="mx-auto max-w-5xl flex items-center justify-between px-4 h-14">
              <a href="/" class="flex items-center gap-2 font-display font-bold text-lg">
                <span class="text-primary">Yorùbá</span>
                <span class="text-xs text-base-content/60 font-normal hidden sm:inline">
                  · learn to speak
                </span>
              </a>
              <nav class="flex items-center gap-4 text-sm">
                {auth?.user ? (
                  <>
                    <a href="/study" class="hover:text-primary">Study</a>
                    <a href="/speak" class="hover:text-primary">Speak</a>
                    <a href="/words" class="hover:text-primary">Words</a>
                    <a href="/decks" class="hover:text-primary">Decks</a>
                    <a href="/culture" class="hover:text-primary">Culture</a>
                    <a href="/progress" class="hover:text-primary">Progress</a>
                    <form method="post" action="/auth/logout" class="inline">
                      <button class="btn btn-ghost btn-xs">Sign out</button>
                    </form>
                  </>
                ) : (
                  <>
                    <a href="/auth/login" class="hover:text-primary">Log in</a>
                    <a href="/auth/signup" class="btn btn-primary btn-sm">
                      Start learning
                    </a>
                  </>
                )}
              </nav>
            </div>
          </header>
          <main class="mx-auto max-w-5xl px-4 py-8">{children}</main>
          <footer class="mx-auto max-w-5xl px-4 py-8 text-xs text-base-content/50">
            Made with ♥ for Yorùbá learners · <a href="/about" class="underline">about</a>
          </footer>
        </body>
      </html>
    );
  }
);
