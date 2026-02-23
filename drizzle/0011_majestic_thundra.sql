CREATE TABLE `invite_code_claims` (
	`invite_code_id` text NOT NULL,
	`user_id` text NOT NULL,
	`claimed_at` integer,
	PRIMARY KEY(`invite_code_id`, `user_id`),
	FOREIGN KEY (`invite_code_id`) REFERENCES `invite_codes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `invite_codes` ADD `max_uses` integer;