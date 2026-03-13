CREATE TABLE `social_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`user_id` text NOT NULL,
	`platform` text NOT NULL,
	`platform_user_id` text,
	`platform_username` text,
	`access_token_sealed` text NOT NULL,
	`refresh_token_sealed` text,
	`token_expires_at` integer,
	`scopes` text NOT NULL,
	`connection_status` text DEFAULT 'connected' NOT NULL,
	`last_refreshed_at` integer,
	`last_error` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `social_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`social_account_id` text NOT NULL,
	`platform_post_id` text NOT NULL,
	`platform` text NOT NULL,
	`post_type` text NOT NULL,
	`caption` text,
	`media_url` text,
	`thumbnail_url` text,
	`permalink` text,
	`like_count` integer,
	`comment_count` integer,
	`share_count` integer,
	`view_count` integer,
	`published_at` integer,
	`fetched_at` integer,
	`created_at` integer,
	FOREIGN KEY (`social_account_id`) REFERENCES `social_accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `social_posts_social_account_id_platform_post_id_unique` ON `social_posts` (`social_account_id`,`platform_post_id`);