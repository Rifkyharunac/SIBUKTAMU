ALTER TABLE `whatsapp_notification_logs` ADD `is_read` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `whatsapp_notification_logs` ADD `read_at` text;--> statement-breakpoint
ALTER TABLE `whatsapp_notification_logs` ADD `archived_at` text;--> statement-breakpoint
CREATE INDEX `whatsapp_read_archived_idx` ON `whatsapp_notification_logs` (`is_read`,`archived_at`);