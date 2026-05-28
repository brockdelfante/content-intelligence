ALTER TABLE `research_summaries` ADD `blogPostsCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `research_summaries` ADD `socialPostsCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `research_summaries` ADD `recentBlogTitles` text;--> statement-breakpoint
ALTER TABLE `research_summaries` ADD `recentSocialTitles` text;--> statement-breakpoint
ALTER TABLE `content_gaps` DROP COLUMN `blogPostsCount`;--> statement-breakpoint
ALTER TABLE `content_gaps` DROP COLUMN `socialPostsCount`;--> statement-breakpoint
ALTER TABLE `content_gaps` DROP COLUMN `recentBlogTitles`;--> statement-breakpoint
ALTER TABLE `content_gaps` DROP COLUMN `recentSocialTitles`;