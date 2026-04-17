import { Context } from 'hono';
import { and, eq } from 'drizzle-orm';
import { decks, userDecks } from '@/db/schema';

// POST /decks/:slug/toggle — flip active flag for current user
export const onRequestPost = async (c: Context) => {
  const auth = c.get('auth');
  if (!auth?.user) return c.text('Unauthorized', 401);
  const db = c.get('db');
  const slug = c.req.param('slug');
  const deck = await db.select().from(decks).where(eq(decks.slug, slug!)).get();
  if (!deck) return c.text('Not found', 404);

  const existing = await db
    .select()
    .from(userDecks)
    .where(and(eq(userDecks.userId, auth.user.id), eq(userDecks.deckId, deck.id)))
    .get();

  if (existing) {
    await db
      .update(userDecks)
      .set({ active: !existing.active })
      .where(and(eq(userDecks.userId, auth.user.id), eq(userDecks.deckId, deck.id)));
  } else {
    await db.insert(userDecks).values({ userId: auth.user.id, deckId: deck.id, active: true });
  }

  const nowActive = existing ? !existing.active : true;

  return c.html(
    <div class={`card ${nowActive ? 'bg-base-200' : 'bg-base-200/40'} border border-base-300`}>
      <div class="card-body">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="card-title">
              <a href={`/decks/${deck.slug}`} class="hover:underline">{deck.name}</a>
            </h3>
            <p class="text-sm text-base-content/80 mt-2">{deck.description}</p>
          </div>
          <form
            hx-post={`/decks/${deck.slug}/toggle`}
            hx-swap="outerHTML"
            hx-target="closest .card"
            class="shrink-0"
          >
            <button class={`btn btn-sm ${nowActive ? 'btn-primary' : 'btn-ghost'}`}>
              {nowActive ? 'Active' : 'Enable'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
