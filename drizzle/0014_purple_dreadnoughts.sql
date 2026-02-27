CREATE TABLE `subscription_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`from_plan` text,
	`to_plan` text,
	`tokens_added` integer,
	`tokens_balance` integer,
	`stripe_event_id` text,
	`created_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
