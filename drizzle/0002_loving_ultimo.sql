ALTER TABLE `content_gaps` ADD `blogPostsCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `content_gaps` ADD `socialPostsCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `content_gaps` ADD `recentBlogTitles` json DEFAULT ('[]') NOT NULL;--> statement-breakpoint
ALTER TABLE `content_gaps` ADD `recentSocialTitles` json DEFAULT ('[]') NOT NULL;--> statement-breakpoint
ALTER TABLE `topics` ADD `sourceNews` json DEFAULT ('[]');