CREATE TABLE `link_daily_stats` (
	`link_id` text NOT NULL,
	`page_id` text NOT NULL,
	`day` text NOT NULL,
	`title` text NOT NULL,
	`clicks` integer DEFAULT 0 NOT NULL,
	CONSTRAINT `link_daily_stats_pk` PRIMARY KEY(`link_id`, `day`),
	CONSTRAINT `fk_link_daily_stats_page_id_pages_id_fk` FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `links` (
	`id` text PRIMARY KEY,
	`page_id` text NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`position` integer NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`starts_at` integer,
	`ends_at` integer,
	CONSTRAINT `fk_links_page_id_pages_id_fk` FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `page_daily_stats` (
	`page_id` text NOT NULL,
	`day` text NOT NULL,
	`source` text NOT NULL,
	`views` integer DEFAULT 0 NOT NULL,
	`clicks` integer DEFAULT 0 NOT NULL,
	CONSTRAINT `page_daily_stats_pk` PRIMARY KEY(`page_id`, `day`, `source`),
	CONSTRAINT `fk_page_daily_stats_page_id_pages_id_fk` FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `pages` (
	`id` text PRIMARY KEY,
	`user_id` text UNIQUE,
	`username` text NOT NULL UNIQUE,
	`display_name` text NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`avatar` text,
	`socials` text DEFAULT '[]' NOT NULL,
	`theme` text NOT NULL,
	`show_create_your_own` integer DEFAULT true NOT NULL,
	`published` integer DEFAULT true NOT NULL,
	`example_order` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `fk_pages_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY,
	`count` integer NOT NULL,
	`reset_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY,
	`page_id` text,
	`username` text NOT NULL,
	`reason` text NOT NULL,
	`details` text DEFAULT '' NOT NULL,
	`contact_email` text,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_reports_page_id_pages_id_fk` FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE INDEX `link_daily_stats_page_day_idx` ON `link_daily_stats` (`page_id`,`day`);--> statement-breakpoint
CREATE INDEX `links_page_position_idx` ON `links` (`page_id`,`position`);--> statement-breakpoint
CREATE INDEX `rate_limits_reset_at_idx` ON `rate_limits` (`reset_at`);--> statement-breakpoint
CREATE INDEX `reports_created_at_idx` ON `reports` (`created_at`);