import { Context } from 'hono';
import { eq, asc } from 'drizzle-orm';
import { decks, phrases } from '@/db/schema';
import { audioUrl } from '@/lib/audio-url';

export const onRequestGet = async (c: Context) => {
  const db = c.get('db');
  const slug = c.req.param('slug');
  const deck = await db.select().from(decks).where(eq(decks.slug, slug!)).get();
  if (!deck) return c.notFound();

  const rows = await db
    .select()
    .from(phrases)
    .where(eq(phrases.deckId, deck.id))
    .orderBy(asc(phrases.frequencyRank));

  return c.render(
    <section class="space-y-6">
      <header>
        <a href="/decks" class="text-sm link">← All decks</a>
        <h1 class="font-display text-3xl mt-2">{deck.name}</h1>
        <p class="text-base-content/70">{deck.description}</p>
      </header>
      <table class="table">
        <thead>
          <tr>
            <th class="w-10">#</th>
            <th>Yorùbá</th>
            <th>English</th>
            <th class="w-24">Audio</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => {
            const url = audioUrl(c.env as any, p.audioKey);
            return (
              <tr>
                <td class="text-base-content/50">{p.frequencyRank ?? i + 1}</td>
                <td class="yo text-lg" lang="yo">{p.yoruba}</td>
                <td>{p.english}</td>
                <td>
                  {url ? (
                    <button
                      class="btn btn-ghost btn-xs"
                      onclick={`new Audio('${url}').play()`}
                      aria-label={`Play ${p.yoruba}`}
                    >
                      ▶
                    </button>
                  ) : (
                    <span class="text-xs text-base-content/40">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>,
    { title: deck.name }
  );
};
