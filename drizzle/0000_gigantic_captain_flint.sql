CREATE TABLE `accounts` (
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`provider_account_id` text NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`token_type` text,
	`scope` text,
	`id_token` text,
	`session_state` text,
	PRIMARY KEY(`provider`, `provider_account_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `calendars` (
	`id` text PRIMARY KEY NOT NULL,
	`galaxy_id` text NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#8b5cf6' NOT NULL,
	`description` text,
	`is_primary` integer DEFAULT false NOT NULL,
	`external_provider` text DEFAULT 'local' NOT NULL,
	`external_calendar_id` text,
	`sync_token` text,
	`last_synced_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`galaxy_id`) REFERENCES `galaxies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `chore_completions` (
	`id` text PRIMARY KEY NOT NULL,
	`chore_id` text NOT NULL,
	`member_id` text NOT NULL,
	`completed_date` text NOT NULL,
	`points_awarded` integer DEFAULT 1 NOT NULL,
	`completed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`chore_id`) REFERENCES `chores`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `galaxy_members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `chores` (
	`id` text PRIMARY KEY NOT NULL,
	`galaxy_id` text NOT NULL,
	`member_id` text NOT NULL,
	`title` text NOT NULL,
	`points` integer DEFAULT 1 NOT NULL,
	`recurrence_type` text DEFAULT 'daily' NOT NULL,
	`days_of_week` text DEFAULT '1,2,3,4,5,6,7',
	`due_time` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`galaxy_id`) REFERENCES `galaxies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `galaxy_members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `display_devices` (
	`id` text PRIMARY KEY NOT NULL,
	`galaxy_id` text,
	`device_name` text DEFAULT 'Wall Tablet' NOT NULL,
	`pairing_code` text,
	`is_paired` integer DEFAULT false NOT NULL,
	`current_mode` text DEFAULT 'standard' NOT NULL,
	`night_sleep_enabled` integer DEFAULT true NOT NULL,
	`sleep_start` text DEFAULT '23:00' NOT NULL,
	`sleep_end` text DEFAULT '06:00' NOT NULL,
	`last_active_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`galaxy_id`) REFERENCES `galaxies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`galaxy_id` text NOT NULL,
	`calendar_id` text,
	`member_id` text,
	`external_uid` text,
	`title` text NOT NULL,
	`description` text,
	`location` text,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`is_all_day` integer DEFAULT false NOT NULL,
	`rrule` text,
	`color_override` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`galaxy_id`) REFERENCES `galaxies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`calendar_id`) REFERENCES `calendars`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `galaxy_members`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `galaxy_members` (
	`id` text PRIMARY KEY NOT NULL,
	`galaxy_id` text NOT NULL,
	`user_id` text,
	`display_name` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`color` text DEFAULT '#8b5cf6' NOT NULL,
	`avatar_icon` text DEFAULT 'user' NOT NULL,
	`star_balance` integer DEFAULT 0 NOT NULL,
	`is_kiosk_profile` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`galaxy_id`) REFERENCES `galaxies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `galaxies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text,
	`theme` text DEFAULT 'milky-way' NOT NULL,
	`icon` text DEFAULT 'sparkles' NOT NULL,
	`parent_pin` text DEFAULT '1234' NOT NULL,
	`timezone` text DEFAULT 'America/New_York' NOT NULL,
	`owner_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `list_items` (
	`id` text PRIMARY KEY NOT NULL,
	`galaxy_id` text NOT NULL,
	`list_type` text DEFAULT 'grocery' NOT NULL,
	`title` text NOT NULL,
	`is_completed` integer DEFAULT false NOT NULL,
	`added_by_member_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`galaxy_id`) REFERENCES `galaxies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`added_by_member_id`) REFERENCES `galaxy_members`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `meal_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`galaxy_id` text NOT NULL,
	`plan_date` text NOT NULL,
	`meal_type` text DEFAULT 'dinner' NOT NULL,
	`title` text NOT NULL,
	`notes` text,
	`recipe_url` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`galaxy_id`) REFERENCES `galaxies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`session_token` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`email` text NOT NULL,
	`email_verified` integer,
	`image` text,
	`default_galaxy_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `verification_tokens` (
	`identifier` text NOT NULL,
	`token` text NOT NULL,
	`expires` integer NOT NULL,
	PRIMARY KEY(`identifier`, `token`)
);
