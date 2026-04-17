import { Context } from 'hono';
import { eq, sql } from 'drizzle-orm';
import { decks, phrases, userDecks } from '@/db/schema';

export const onRequestGet = async (c: Context) => {
  const db = c.get('db');
  const auth = c.get('auth');
  if (!auth?.user) return c.redirect('/auth/login');

  // deck list with phrase count + user activation
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
    <section class="space-y-6">
      <header>
        <h1 class="font-display text-3xl">Decks</h1>
        <p class="text-base-content/70">Toggle which decks to study from. New phrases are drawn from active decks.</p>
      </header>
      <div class="grid md:grid-cols-2 gap-4">
        {rows.map((d) => (
          <div class={`card ${d.active ? 'bg-base-200' : 'bg-base-200/40'} border border-base-300`}>
            <div class="card-body">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <h3 class="card-title">
                    <a href={`/decks/${d.slug}`} class="hover:underline">{d.name}</a>
                  </h3>
                  <p class="text-xs text-base-content/60 mt-1">{d.phraseCount} phrases · {d.kind}</p>
                  <p class="text-sm text-base-content/80 mt-2">{d.description}</p>
                </div>
                <form
                  hx-post={`/decks/${d.slug}/toggle`}
                  hx-swap="outerHTML"
                  hx-target="closest .card"
                  class="shrink-0"
                >
                  <button class={`btn btn-sm ${d.active ? 'btn-primary' : 'btn-ghost'}`}>
                    {d.active ? 'Active' : 'Enable'}
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
