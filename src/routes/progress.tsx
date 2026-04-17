import { Context } from 'hono';
import { and, eq, gte, sql } from 'drizzle-orm';
import { userProgress, reviews } from '@/db/schema';
import { rankFor, progressToNextRank, RANKS } from '@/lib/fluency';

export const onRequestGet = async (c: Context) => {
  const auth = c.get('auth');
  if (!auth?.user) return c.redirect('/auth/login');
  const db = c.get('db');

  const prog = await db.select().from(userProgress).where(eq(userProgress.userId, auth.user.id)).get();
  const known = prog?.knownCount ?? 0;
  const { current, next, pct, remaining } = progressToNextRank(known);

  // Last 365 days heatmap data
  const since = new Date(Date.now() - 365 * 86400000);
  const daily = await db
    .select({
      day: sql<string>`strftime('%Y-%m-%d', datetime(${reviews.reviewedAt}, 'unixepoch'))`,
      count: sql<number>`count(*)`
    })
    .from(reviews)
    .where(and(eq(reviews.userId, auth.user.id), gte(reviews.reviewedAt, since)))
    .groupBy(sql`1`);

  const byDay = new Map(daily.map((d) => [d.day, d.count]));

  // Build 53 weeks x 7 days grid starting from 364 days ago
  const weeks: { day: string; count: number }[][] = [];
  const start = new Date(Date.now() - 364 * 86400000);
  for (let w = 0; w < 53; w++) {
    const week: { day: string; count: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const dt = new Date(start.getTime() + (w * 7 + d) * 86400000);
      const key = dt.toISOString().slice(0, 10);
      week.push({ day: key, count: byDay.get(key) ?? 0 });
    }
    weeks.push(week);
  }

  const maxCount = Math.max(1, ...daily.map((d) => d.count));
  const intensity = (n: number) => {
    if (n === 0) return 'bg-base-300/40';
    const r = n / maxCount;
    if (r < 0.25) return 'bg-primary/25';
    if (r < 0.5) return 'bg-primary/50';
    if (r < 0.75) return 'bg-primary/75';
    return 'bg-primary';
  };

  return c.render(
    <section class="space-y-8 max-w-3xl mx-auto">
      <header>
        <h1 class="font-display text-3xl">Progress</h1>
      </header>

      {/* Rank */}
      <div class="card bg-base-200">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm text-base-content/60">Current rank</div>
              <div class="text-3xl font-display">
                <span class="mr-2">{current.emoji}</span>
                {current.label}
              </div>
              <div class="text-base-content/70 mt-1">{known.toLocaleString()} words known</div>
            </div>
            <div class="text-right">
              <div class="stat p-0">
                <div class="stat-title">Streak</div>
                <div class="stat-value text-primary">{prog?.streakDays ?? 0}🔥</div>
                <div class="stat-desc">best {prog?.bestStreak ?? 0}</div>
              </div>
            </div>
          </div>
          {next && (
            <>
              <progress class="progress progress-primary mt-4" value={pct * 100} max={100}></progress>
              <div class="text-xs text-base-content/60 mt-1">
                {remaining.toLocaleString()} more to reach {next.emoji} {next.label}
              </div>
            </>
          )}
        </div>
      </div>

      {/* XP */}
      <div class="stats shadow w-full">
        <div class="stat">
          <div class="stat-title">XP</div>
          <div class="stat-value">{(prog?.xp ?? 0).toLocaleString()}</div>
        </div>
        <div class="stat">
          <div class="stat-title">Total reviews</div>
          <div class="stat-value">{(prog?.totalReviews ?? 0).toLocaleString()}</div>
        </div>
        <div class="stat">
          <div class="stat-title">Learning</div>
          <div class="stat-value">{prog?.learningCount ?? 0}</div>
        </div>
      </div>

      {/* Heatmap */}
      <div class="card bg-base-200">
        <div class="card-body">
          <h3 class="card-title">Last 365 days</h3>
          <div class="overflow-x-auto">
            <div class="inline-grid grid-flow-col auto-cols-max gap-[3px]">
              {weeks.map((w) => (
                <div class="grid grid-rows-7 gap-[3px]">
                  {w.map((d) => (
                    <div
                      title={`${d.day}: ${d.count}`}
                      class={`w-3 h-3 rounded-sm ${intensity(d.count)}`}
                    ></div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Rank ladder */}
      <div class="card bg-base-200">
        <div class="card-body">
          <h3 class="card-title">The rank ladder</h3>
          <ul class="grid grid-cols-2 gap-2 mt-2">
            {RANKS.map((r) => (
              <li
                class={`flex items-center gap-3 p-3 rounded-field ${
                  r.slug === current.slug ? 'bg-primary/10 border border-primary' : 'bg-base-100'
                }`}
              >
                <span class="text-2xl">{r.emoji}</span>
                <div>
                  <div class="font-semibold">{r.label}</div>
                  <div class="text-xs text-base-content/60">
                    {r.min.toLocaleString()}
                    {r.max === Infinity ? '+' : `–${(r.max - 1).toLocaleString()}`} words
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>,
    { title: 'Progress' }
  );
};
