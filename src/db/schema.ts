import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ---------- Users & Auth ----------

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
  // Study prefs
  dailyGoal: integer('daily_goal').notNull().default(20),
  newPerDay: integer('new_per_day').notNull().default(15),
  timezone: text('timezone').notNull().default('UTC'),
  preferences: text('preferences', { mode: 'json' }).$type<Record<string, unknown>>().default({})
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  data: text('data').notNull().default('{}'),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
});

// WebAuthn credentials — scaffolded for v1.1 passkey support
export const userCredentials = sqliteTable('user_credentials', {
  id: text('id').primaryKey(), // credentialID (base64url)
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  publicKey: text('public_key').notNull(),
  counter: integer('counter').notNull().default(0),
  transports: text('transports'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});

// ---------- Content ----------

export const decks = sqliteTable('decks', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  kind: text('kind', { enum: ['core', 'slang', 'culture', 'custom'] })
    .notNull()
    .default('core'),
  isBuiltIn: integer('is_built_in', { mode: 'boolean' }).notNull().default(true),
  priority: integer('priority').notNull().default(100), // lower = higher priority
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});

export const phrases = sqliteTable(
  'phrases',
  {
    id: text('id').primaryKey(),
    deckId: text('deck_id')
      .notNull()
      .references(() => decks.id, { onDelete: 'cascade' }),
    yoruba: text('yoruba').notNull(),
    english: text('english').notNull(),
    ipa: text('ipa'),
    partOfSpeech: text('part_of_speech'),
    tags: text('tags', { mode: 'json' }).$type<string[]>().default([]),
    frequencyRank: integer('frequency_rank'), // nullable for slang/culture
    audioKey: text('audio_key'), // R2 object key
    audioSource: text('audio_source', { enum: ['tts', 'native', 'none'] })
      .notNull()
      .default('none'),
    contextSentence: text('context_sentence'),
    contextEnglish: text('context_english'),
    cultureNoteId: text('culture_note_id'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
  },
  (t) => ({
    deckFreqIdx: index('phrases_deck_freq_idx').on(t.deckId, t.frequencyRank)
  })
);

export const cultureNotes = sqliteTable('culture_notes', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  body: text('body').notNull(), // markdown
  summary: text('summary'),
  relatedPhraseIds: text('related_phrase_ids', { mode: 'json' }).$type<string[]>().default([]),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});

// ---------- SRS State ----------

export const cards = sqliteTable(
  'cards',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    phraseId: text('phrase_id')
      .notNull()
      .references(() => phrases.id, { onDelete: 'cascade' }),
    // FSRS state
    state: text('state', { enum: ['new', 'learning', 'review', 'relearning'] })
      .notNull()
      .default('new'),
    due: integer('due', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    stability: integer('stability').notNull().default(0), // stored as ×1000 for millidays precision
    difficulty: integer('difficulty').notNull().default(0), // ×1000
    elapsedDays: integer('elapsed_days').notNull().default(0),
    scheduledDays: integer('scheduled_days').notNull().default(0),
    reps: integer('reps').notNull().default(0),
    lapses: integer('lapses').notNull().default(0),
    lastReview: integer('last_review', { mode: 'timestamp' }),
    suspended: integer('suspended', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
  },
  (t) => ({
    userDueIdx: index('cards_user_due_idx').on(t.userId, t.due),
    userStateIdx: index('cards_user_state_idx').on(t.userId, t.state),
    userPhraseUniq: uniqueIndex('cards_user_phrase_uniq').on(t.userId, t.phraseId)
  })
);

export const reviews = sqliteTable(
  'reviews',
  {
    id: text('id').primaryKey(),
    cardId: text('card_id')
      .notNull()
      .references(() => cards.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    rating: integer('rating').notNull(), // 1=again 2=hard 3=good 4=easy
    reviewedAt: integer('reviewed_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    elapsedMs: integer('elapsed_ms'),
    mode: text('mode', { enum: ['listen', 'read', 'speak'] }).notNull().default('read')
  },
  (t) => ({
    userTimeIdx: index('reviews_user_time_idx').on(t.userId, t.reviewedAt)
  })
);

export const speakAttempts = sqliteTable('speak_attempts', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  phraseId: text('phrase_id')
    .notNull()
    .references(() => phrases.id, { onDelete: 'cascade' }),
  audioKey: text('audio_key'), // R2 key of user's recording
  transcript: text('transcript'),
  score: integer('score'), // 0-100
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});

// ---------- Progress (denormalised for dashboard speed) ----------

export const userProgress = sqliteTable('user_progress', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  knownCount: integer('known_count').notNull().default(0),
  learningCount: integer('learning_count').notNull().default(0),
  streakDays: integer('streak_days').notNull().default(0),
  bestStreak: integer('best_streak').notNull().default(0),
  lastStudyDate: text('last_study_date'), // YYYY-MM-DD in user tz
  xp: integer('xp').notNull().default(0),
  rankSlug: text('rank_slug').notNull().default('omo-tuntun'),
  totalReviews: integer('total_reviews').notNull().default(0),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});

// Deck activation per user (which decks they are actively studying)
export const userDecks = sqliteTable(
  'user_decks',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    deckId: text('deck_id')
      .notNull()
      .references(() => decks.id, { onDelete: 'cascade' }),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    addedAt: integer('added_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
  },
  (t) => ({
    pk: uniqueIndex('user_decks_pk').on(t.userId, t.deckId)
  })
);
