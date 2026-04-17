CREATE TABLE `cards` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`phrase_id` text NOT NULL,
	`state` text DEFAULT 'new' NOT NULL,
	`due` integer DEFAULT (unixepoch()) NOT NULL,
	`stability` integer DEFAULT 0 NOT NULL,
	`difficulty` integer DEFAULT 0 NOT NULL,
	`elapsed_days` integer DEFAULT 0 NOT NULL,
	`scheduled_days` integer DEFAULT 0 NOT NULL,
	`reps` integer DEFAULT 0 NOT NULL,
	`lapses` integer DEFAULT 0 NOT NULL,
	`last_review` integer,
	`suspended` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`phrase_id`) REFERENCES `phrases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `cards_user_due_idx` ON `cards` (`user_id`,`due`);--> statement-breakpoint
CREATE INDEX `cards_user_state_idx` ON `cards` (`user_id`,`state`);--> statement-breakpoint
CREATE UNIQUE INDEX `cards_user_phrase_uniq` ON `cards` (`user_id`,`phrase_id`);--> statement-breakpoint
CREATE TABLE `culture_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`summary` text,
	`related_phrase_ids` text DEFAULT '[]',
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `culture_notes_slug_unique` ON `culture_notes` (`slug`);--> statement-breakpoint
CREATE TABLE `decks` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`kind` text DEFAULT 'core' NOT NULL,
	`is_built_in` integer DEFAULT true NOT NULL,
	`priority` integer DEFAULT 100 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `decks_slug_unique` ON `decks` (`slug`);--> statement-breakpoint
CREATE TABLE `phrases` (
	`id` text PRIMARY KEY NOT NULL,
	`deck_id` text NOT NULL,
	`yoruba` text NOT NULL,
	`english` text NOT NULL,
	`ipa` text,
	`part_of_speech` text,
	`tags` text DEFAULT '[]',
	`frequency_rank` integer,
	`audio_key` text,
	`audio_source` text DEFAULT 'none' NOT NULL,
	`context_sentence` text,
	`context_english` text,
	`culture_note_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `phrases_deck_freq_idx` ON `phrases` (`deck_id`,`frequency_rank`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`card_id` text NOT NULL,
	`user_id` text NOT NULL,
	`rating` integer NOT NULL,
	`reviewed_at` integer DEFAULT (unixepoch()) NOT NULL,
	`elapsed_ms` integer,
	`mode` text DEFAULT 'read' NOT NULL,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reviews_user_time_idx` ON `reviews` (`user_id`,`reviewed_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `speak_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`phrase_id` text NOT NULL,
	`audio_key` text,
	`transcript` text,
	`score` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`phrase_id`) REFERENCES `phrases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_credentials` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`public_key` text NOT NULL,
	`counter` integer DEFAULT 0 NOT NULL,
	`transports` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_decks` (
	`user_id` text NOT NULL,
	`deck_id` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`added_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_decks_pk` ON `user_decks` (`user_id`,`deck_id`);--> statement-breakpoint
CREATE TABLE `user_progress` (
	`user_id` text PRIMARY KEY NOT NULL,
	`known_count` integer DEFAULT 0 NOT NULL,
	`learning_count` integer DEFAULT 0 NOT NULL,
	`streak_days` integer DEFAULT 0 NOT NULL,
	`best_streak` integer DEFAULT 0 NOT NULL,
	`last_study_date` text,
	`xp` integer DEFAULT 0 NOT NULL,
	`rank_slug` text DEFAULT 'omo-tuntun' NOT NULL,
	`total_reviews` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`display_name` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`last_login_at` integer,
	`daily_goal` integer DEFAULT 20 NOT NULL,
	`new_per_day` integer DEFAULT 15 NOT NULL,
	`timezone` text DEFAULT 'UTC' NOT NULL,
	`preferences` text DEFAULT '{}'
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);