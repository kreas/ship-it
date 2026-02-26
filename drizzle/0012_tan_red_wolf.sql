CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`stripe_customer_id` text,
	`stripe_subscription_id` text,
	`stripe_price_id` text,
	`plan` text DEFAULT 'free' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`workspace_limit` integer DEFAULT 1,
	`monthly_token_quota` integer DEFAULT 0,
	`tokens_remaining` integer DEFAULT 0 NOT NULL,
	`tokens_reset_at` integer,
	`auto_reload_enabled` integer DEFAULT false NOT NULL,
	`auto_reload_amount` integer,
	`auto_reload_threshold` integer,
	`max_monthly_auto_reload` integer,
	`monthly_auto_reloaded_so_far` integer DEFAULT 0 NOT NULL,
	`monthly_auto_reload_reset_at` integer,
	`current_period_start` integer,
	`current_period_end` integer,
	`cancel_at_period_end` integer DEFAULT false NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_user_id_unique` ON `subscriptions` (`user_id`);