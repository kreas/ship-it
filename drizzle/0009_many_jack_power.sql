CREATE TABLE `invite_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text,
	`created_at` integer,
	`expires_at` integer
);
--> statement-breakpoint
ALTER TABLE `users` ADD `status` text DEFAULT 'waitlisted' NOT NULL;
--> statement-breakpoint
UPDATE `users` SET `status` = 'active';
