import { Context } from 'hono';
import { and, eq } from 'drizzle-orm';
import { decks, userDecks } from '@/db/schema';

const ICON: Record<string, string> = { core: '📖', slang: '💬', culture: '🥁', custom: '⭐' };

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

  const active = existing ? !existing.active : true;

  return c.html(
    <div class={`card ${active ? 'bg-base-200' : 'bg-base-200/50'} border ${active ? 'border-primary/40' : 'border-base-300/60'} transition-colors`}>
      <div class="card-body">
        <div class="flex items-start justify-between">
          <div class="text-3xl">{ICON[deck.kind] ?? '📖'}</div>
          {active && <span class="badge badge-primary badge-sm">Active</span>}
        </div>
        <h3 class="font-display text-xl font-semibold mt-2">
          <a href={`/decks/${deck.slug}`} class="hover:text-primary transition-colors">{deck.name}</a>
        </h3>
        <p class="text-sm text-base-content/70">{deck.description}</p>
        <div class="card-actions mt-4 flex-wrap">
          <a href={`/decks/${deck.slug}`} class="btn btn-ghost btn-sm flex-1">Browse</a>
          <form
            hx-post={`/decks/${deck.slug}/toggle`}
            hx-swap="outerHTML"
            hx-target="closest .card"
            class="flex-1"
          >
            <button class={`btn btn-sm w-full ${active ? 'btn-outline' : 'btn-primary'}`}>
              {active ? 'Disable' : 'Enable'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
