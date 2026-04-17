import { Context } from 'hono';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { cards, phrases, decks } from '@/db/schema';
import {
  retrievability,
  daysUntilDue,
  formatInterval,
  tier,
  TIER_COLOR,
  TIER_LABEL
} from '@/lib/retrievability';
import { audioUrl } from '@/lib/audio-url';

type SortKey = 'due' | 'weak' | 'strong' | 'recent' | 'alpha';

export const onRequestGet = async (c: Context) => {
  const auth = c.get('auth');
  if (!auth?.user) return c.redirect('/auth/login');
  const db = c.get('db');

  const sort = (c.req.query('sort') as SortKey) || 'due';
  const filter = c.req.query('filter') || 'all'; // all | due | mature | weak | learning
  const q = (c.req.query('q') || '').trim().toLowerCase();

  // Pull everything for this user then filter/sort in JS — fine for <50k words.
  const rows = await db
    .select({
      card: cards,
      phrase: phrases,
      deckSlug: decks.slug,
      deckName: decks.name
    })
    .from(cards)
    .innerJoin(phrases, eq(cards.phraseId, phrases.id))
    .innerJoin(decks, eq(phrases.deckId, decks.id))
    .where(eq(cards.userId, auth.user.id));

  const now = new Date();
  const enriched = rows.map((r) => {
    const retr = retrievability(r.card, now);
    const stabilityDays = (r.card.stability ?? 0) / 1000;
    const dueIn = daysUntilDue(r.card, now);
    return {
      ...r,
      retr,
      stabilityDays,
      dueIn,
      tier: tier(retr, stabilityDays)
    };
  });

  const filtered = enriched.filter((x) => {
    if (q && !`${x.phrase.yoruba} ${x.phrase.english}`.toLowerCase().includes(q)) return false;
    if (filter === 'due') return x.dueIn <= 0 && !x.card.suspended;
    if (filter === 'mature') return x.tier === 'mature';
    if (filter === 'weak') return x.tier === 'weak';
    if (filter === 'learning') return x.card.state === 'learning' || x.card.state === 'relearning';
    return true;
  });

  filtered.sort((a, b) => {
    switch (sort) {
      case 'weak':
        return a.retr - b.retr;
      case 'strong':
        return b.stabilityDays - a.stabilityDays;
      case 'recent':
        return (b.card.lastReview?.getTime() ?? 0) - (a.card.lastReview?.getTime() ?? 0);
      case 'alpha':
        return a.phrase.yoruba.localeCompare(b.phrase.yoruba, 'yo');
      case 'due':
      default:
        return a.dueIn - b.dueIn;
    }
  });

  // Summary stats
  const totals = {
    total: enriched.length,
    mature: enriched.filter((e) => e.tier === 'mature').length,
    strong: enriched.filter((e) => e.tier === 'strong').length,
    building: enriched.filter((e) => e.tier === 'building').length,
    weak: enriched.filter((e) => e.tier === 'weak').length,
    due: enriched.filter((e) => e.dueIn <= 0 && !e.card.suspended).length
  };

  const pill = (key: string, label: string) => (
    <a
      href={`/words?filter=${key}&sort=${sort}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
      class={`badge ${filter === key ? 'badge-primary' : 'badge-ghost'}`}
    >
      {label}
    </a>
  );

  return c.render(
    <section class="space-y-6">
      <header class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="font-display text-3xl">Your vocabulary</h1>
          <p class="text-base-content/70">
            {totals.total} words you've started · {totals.due} due now
          </p>
        </div>
        <div class="flex gap-3 flex-wrap">
          <form method="get" action="/words" class="join">
            <input type="hidden" name="filter" value={filter} />
            <input type="hidden" name="sort" value={sort} />
            <input
              class="input input-bordered input-sm join-item w-52"
              name="q"
              placeholder="Search Yorùbá or English…"
              value={q}
            />
            <button class="btn btn-sm join-item">Search</button>
          </form>
        </div>
      </header>

      {/* Stat cards */}
      <div class="stats shadow w-full">
        <div class="stat">
          <div class="stat-title">Mature</div>
          <div class="stat-value text-primary">{totals.mature}</div>
          <div class="stat-desc">stability ≥ 6 months</div>
        </div>
        <div class="stat">
          <div class="stat-title">Strong</div>
          <div class="stat-value text-success">{totals.strong}</div>
          <div class="stat-desc">stability ≥ 3 weeks</div>
        </div>
        <div class="stat">
          <div class="stat-title">Building</div>
          <div class="stat-value text-warning">{totals.building}</div>
          <div class="stat-desc">forming memory</div>
        </div>
        <div class="stat">
          <div class="stat-title">Weak</div>
          <div class="stat-value text-error">{totals.weak}</div>
          <div class="stat-desc">confidence &lt; 60%</div>
        </div>
      </div>

      {/* Filters + sort */}
      <div class="flex flex-wrap gap-2 items-center justify-between">
        <div class="flex gap-2 flex-wrap">
          {pill('all', 'All')}
          {pill('due', `Due (${totals.due})`)}
          {pill('learning', 'Learning')}
          {pill('weak', 'Weak')}
          {pill('mature', 'Mature')}
        </div>
        <form method="get" action="/words" class="flex items-center gap-2 text-sm">
          <input type="hidden" name="filter" value={filter} />
          {q && <input type="hidden" name="q" value={q} />}
          <label>Sort:</label>
          <select class="select select-sm select-bordered" name="sort" onchange="this.form.submit()">
            <option value="due" selected={sort === 'due'}>Next review</option>
            <option value="weak" selected={sort === 'weak'}>Weakest first</option>
            <option value="strong" selected={sort === 'strong'}>Strongest first</option>
            <option value="recent" selected={sort === 'recent'}>Recently reviewed</option>
            <option value="alpha" selected={sort === 'alpha'}>A → Z</option>
          </select>
        </form>
      </div>

      {filtered.length === 0 ? (
        <div class="text-center py-16 text-base-content/60">
          No words match. <a class="link" href="/study">Start a session</a> to add some.
        </div>
      ) : (
        <div class="overflow-x-auto">
          <table class="table table-sm">
            <thead>
              <tr>
                <th>Yorùbá</th>
                <th>English</th>
                <th class="w-40">Confidence</th>
                <th class="w-28 text-right">Next review</th>
                <th class="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 500).map((x) => {
                const url = audioUrl(c.env as any, x.phrase.audioKey);
                const pct = Math.round(x.retr * 100);
                return (
                  <tr>
                    <td>
                      <div class="flex items-center gap-2">
                        <span lang="yo" class="yo text-base font-medium">{x.phrase.yoruba}</span>
                        {url && (
                          <button
                            class="btn btn-ghost btn-xs"
                            onclick={`new Audio('${url}').play()`}
                            aria-label="Play"
                          >
                            ▶
                          </button>
                        )}
                      </div>
                      <div class="text-xs text-base-content/50">{x.deckName}</div>
                    </td>
                    <td>
                      <div>{x.phrase.english}</div>
                      <div class="text-xs text-base-content/50 capitalize">
                        {x.card.state} · {x.card.reps} rep{x.card.reps === 1 ? '' : 's'}
                        {x.card.lapses > 0 && ` · ${x.card.lapses} lapse${x.card.lapses === 1 ? '' : 's'}`}
                      </div>
                    </td>
                    <td>
                      <div class="flex flex-col gap-1">
                        <progress
                          class={`progress ${TIER_COLOR[x.tier]} w-full h-2`}
                          value={pct}
                          max={100}
                        ></progress>
                        <div class="flex items-center justify-between text-xs">
                          <span class="text-base-content/70">{TIER_LABEL[x.tier]}</span>
                          <span class="tabular-nums text-base-content/60">{pct}%</span>
                        </div>
                      </div>
                    </td>
                    <td class="text-right">
                      <div class="tabular-nums">{formatInterval(x.dueIn)}</div>
                      <div class="text-xs text-base-content/50">
                        {x.stabilityDays < 1
                          ? `${Math.round(x.stabilityDays * 24)}h strength`
                          : `${Math.round(x.stabilityDays)}d strength`}
                      </div>
                    </td>
                    <td>
                      <a class="btn btn-ghost btn-xs" href={`/speak?phraseId=${x.phrase.id}`}>
                        say
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length > 500 && (
            <div class="text-xs text-base-content/50 text-center py-3">
              Showing first 500 of {filtered.length}. Narrow with search or filters.
            </div>
          )}
        </div>
      )}
    </section>,
    { title: 'Vocabulary' }
  );
};
