import { Context } from 'hono';
import { eq, sql } from 'drizzle-orm';
import { decks, phrases, userDecks } from '@/db/schema';

const DECK_ICON: Record<string, string> = {
  core: '📖',
  slang: '💬',
  culture: '🥁',
  custom: '⭐'
};

export const onRequestGet = async (c: Context) => {
  const db = c.get('db');
  const auth = c.get('auth');
  if (!auth?.user) return c.redirect('/auth/login');

  const rows = await db
    .select({
      id: decks.id,
      slug: decks.slug,
      name: decks.name,
      description: decks.description,
      kind: decks.kind,
      priority: decks.priority,
      phraseCount: sql<number>`(SELECT COUNT(*) FROM ${phrases} WHERE ${phrases.deckId} = ${decks.id})`,
      active: sql<number>`(SELECT active FROM ${userDecks} WHERE ${userDecks.userId} = ${auth.user.id} AND ${userDecks.deckId} = ${decks.id})`
    })
    .from(decks)
    .orderBy(decks.priority);

  return c.render(
    <section class="space-y-8">
      <header>
        <h1 class="font-display text-4xl font-bold">Decks</h1>
        <p class="text-base-content/70 mt-1">
          Choose which decks feed your study queue. You can always toggle.
        </p>
      </header>

      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map((d) => (
          <div class={`card ${d.active ? 'bg-base-200' : 'bg-base-200/50'} border ${d.active ? 'border-primary/40' : 'border-base-300/60'} transition-colors`}>
            <div class="card-body">
              <div class="flex items-start justify-between">
                <div class="text-3xl">{DECK_ICON[d.kind] ?? '📖'}</div>
                {d.active && (
                  <span class="badge badge-primary badge-sm">Active</span>
                )}
              </div>
              <h3 class="font-display text-xl font-semibold mt-2">
                <a href={`/decks/${d.slug}`} class="hover:text-primary transition-colors">{d.name}</a>
              </h3>
              <p class="text-sm text-base-content/70">{d.description}</p>
              <div class="text-xs text-base-content/50 tabular-nums">
                {d.phraseCount} phrases
              </div>
              <div class="card-actions mt-4 flex-wrap">
                <a href={`/decks/${d.slug}`} class="btn btn-ghost btn-sm flex-1">Browse</a>
                <form
                  hx-post={`/decks/${d.slug}/toggle`}
                  hx-swap="outerHTML"
                  hx-target="closest .card"
                  class="flex-1"
                >
                  <button class={`btn btn-sm w-full ${d.active ? 'btn-outline' : 'btn-primary'}`}>
                    {d.active ? 'Disable' : 'Enable'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>,
    { title: 'Decks' }
  );
};
