import { Context } from 'hono';
import { cultureNotes } from '@/db/schema';

export const onRequestGet = async (c: Context) => {
  const db = c.get('db');
  const notes = await db.select().from(cultureNotes);
  return c.render(
    <section class="space-y-6">
      <header>
        <h1 class="font-display text-3xl">Culture & context</h1>
        <p class="text-base-content/70">Essays on greetings, tones, dialects, and more.</p>
      </header>
      <ul class="grid md:grid-cols-2 gap-4">
        {notes.map((n) => (
          <li class="card bg-base-200">
            <div class="card-body">
              <h3 class="card-title">
                <a class="link" href={`/culture/${n.slug}`}>{n.title}</a>
              </h3>
              <p class="text-sm text-base-content/70">{n.summary}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>,
    { title: 'Culture' }
  );
};
