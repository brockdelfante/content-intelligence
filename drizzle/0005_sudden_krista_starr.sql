CREATE TABLE `user_topics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`topicType` enum('social','article') NOT NULL,
	`topicTitle` text NOT NULL,
	`newsSourceTitle` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_topics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `research_summaries` DROP COLUMN `blogPostsCount`;--> statement-breakpoint
ALTER TABLE `research_summaries` DROP COLUMN `socialPostsCount`;--> statement-breakpoint
ALTER TABLE `research_summaries` DROP COLUMN `recentBlogTitles`;--> statement-breakpoint
ALTER TABLE `research_summaries` DROP COLUMN `recentSocialTitles`;