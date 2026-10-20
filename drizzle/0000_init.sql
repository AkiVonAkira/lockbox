CREATE TABLE `shares` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`pin` text NOT NULL,
	`items` text NOT NULL,
	`item_count` integer NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`views` integer DEFAULT 0 NOT NULL,
	`last_viewed_at` integer,
	`failed_attempts` integer DEFAULT 0 NOT NULL,
	`locked_until` integer
);
