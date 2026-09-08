CREATE TABLE `security_rate_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`hits` integer DEFAULT 1 NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `security_rate_expiry_idx` ON `security_rate_limits` (`expires_at`);--> statement-breakpoint
ALTER TABLE `visits` ADD `checkout_token_hash` text;