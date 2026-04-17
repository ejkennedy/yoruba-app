import { Context } from 'hono';
import { and, eq } from 'drizzle-orm';
import { cards, phrases, reviews, userProgress } from '@/db/schema';
import { grade, isKnown } from '@/lib/fsrs';
import { rankFor, XP_REWARD } from '@/lib/fluency';
import { ReviewPanel, SessionComplete } from '@/components/ReviewPanel';

export const onRequestPost = async (c: Context) => {
  const auth = c.get('auth');
  if (!auth?.user) return c.text('Unauthorized', 401);
  const db = c.get('db');

  const form = await c.req.formData();
  const action = String(form.get('action') || 'grade');
  const phraseId = String(form.get('phraseId'));
  const kind = (String(form.get('kind') || 'new') as 'new' | 'review');
  const index = parseInt(String(form.get('index') || '0'), 10);
  const total = parseInt(String(form.get('total') || '1'), 10);
  let queue: { phraseId: string }[] = [];
  try {
    queue = JSON.parse(decodeURIComponent(String(form.get('queue') || '[]')));
  } catch {
    queue = [];
  }

  // Stage 1 — reveal answer: no DB write, re-render same phrase in 'answer' stage
  if (action === 'reveal') {
    const phrase = await db.select().from(phrases).where(eq(phrases.id, phraseId)).get();
    if (!phrase) return c.text('Phrase missing', 404);
    return c.html(
      <ReviewPanel
        env={c.env}
        item={{
          phraseId: phrase.id,
          cardId: String(form.get('cardId') || '') || null,
          yoruba: phrase.yoruba,
          english: phrase.english,
          audioKey: phrase.audioKey,
          deckSlug: '', // unused in answer stage display
          kind
        }}
        queue={queue}
        index={index}
        total={total}
        stage="answer"
      />
    );
  }

  // Stage 2 — apply grade
  const rating = Math.max(1, Math.min(4, parseInt(String(form.get('rating') || '3'), 10))) as 1 | 2 | 3 | 4;
  const cardIdInput = String(form.get('cardId') || '');

  // Load or create card
  let cardRow = cardIdInput
    ? await db.select().from(cards).where(eq(cards.id, cardIdInput)).get()
    : await db
        .select()
        .from(cards)
        .where(and(eq(cards.userId, auth.user.id), eq(cards.phraseId, phraseId)))
        .get();

  if (!cardRow) {
    const id = crypto.randomUUID();
    await db.insert(cards).values({ id, userId: auth.user.id, phraseId });
    cardRow = (await db.select().from(cards).where(eq(cards.id, id)).get())!;
  }

  const wasKnown = isKnown(cardRow);
  const { next } = grade(cardRow, rating);
  await db.update(cards).set(next).where(eq(cards.id, cardRow.id));

  const updatedRow = { ...cardRow, ...next } as typeof cardRow;
  const nowKnown = isKnown(updatedRow);

  // Review log
  await db.insert(reviews).values({
    id: crypto.randomUUID(),
    cardId: cardRow.id,
    userId: auth.user.id,
    rating,
    mode: 'read'
  });

  // Progress: XP, known-count delta, streak
  const today = new Date().toISOString().slice(0, 10);
  const prog = await db.select().from(userProgress).where(eq(userProgress.userId, auth.user.id)).get();
  const knownDelta = nowKnown && !wasKnown ? 1 : !nowKnown && wasKnown ? -1 : 0;
  const newKnown = Math.max(0, (prog?.knownCount ?? 0) + knownDelta);
  const newXp = (prog?.xp ?? 0) + XP_REWARD[rating];

  // streak
  let streakDays = prog?.streakDays ?? 0;
  let bestStreak = prog?.bestStreak ?? 0;
  if (prog?.lastStudyDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    streakDays = prog?.lastStudyDate === yesterday ? streakDays + 1 : 1;
    if (streakDays > bestStreak) bestStreak = streakDays;
  }

  await db
    .insert(userProgress)
    .values({
      userId: auth.user.id,
      knownCount: newKnown,
      xp: newXp,
      streakDays,
      bestStreak,
      lastStudyDate: today,
      totalReviews: (prog?.totalReviews ?? 0) + 1,
      rankSlug: rankFor(newKnown).slug,
      updatedAt: new Date()
    })
    .onConflictDoUpdate({
      target: userProgress.userId,
      set: {
        knownCount: newKnown,
        xp: newXp,
        streakDays,
        bestStreak,
        lastStudyDate: today,
        totalReviews: (prog?.totalReviews ?? 0) + 1,
        rankSlug: rankFor(newKnown).slug,
        updatedAt: new Date()
      }
    });

  // Next card — or completion
  if (queue.length === 0) {
    return c.html(<SessionComplete total={total} />);
  }

  const [nextPhraseRef, ...rest] = queue;
  const nextPhrase = await db
    .select({
      id: phrases.id,
      yoruba: phrases.yoruba,
      english: phrases.english,
      audioKey: phrases.audioKey,
      deckId: phrases.deckId
    })
    .from(phrases)
    .where(eq(phrases.id, nextPhraseRef.phraseId))
    .get();
  if (!nextPhrase) return c.html(<SessionComplete total={total} />);

  const existingCard = await db
    .select({ id: cards.id })
    .from(cards)
    .where(and(eq(cards.userId, auth.user.id), eq(cards.phraseId, nextPhrase.id)))
    .get();

  return c.html(
    <ReviewPanel
      env={c.env}
      item={{
        phraseId: nextPhrase.id,
        cardId: existingCard?.id ?? null,
        yoruba: nextPhrase.yoruba,
        english: nextPhrase.english,
        audioKey: nextPhrase.audioKey,
        deckSlug: '',
        kind: existingCard ? 'review' : 'new'
      }}
      queue={rest}
      index={index + 1}
      total={total}
      stage="prompt"
    />
  );
};
