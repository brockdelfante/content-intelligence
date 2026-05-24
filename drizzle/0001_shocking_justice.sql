CREATE TABLE `agent_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runDate` varchar(16) NOT NULL,
	`status` enum('running','success','failed') NOT NULL DEFAULT 'running',
	`topicsAdded` int NOT NULL DEFAULT 0,
	`keywordsUpdated` int NOT NULL DEFAULT 0,
	`gapsFound` int NOT NULL DEFAULT 0,
	`summary` text,
	`error` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agent_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `app_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(128) NOT NULL,
	`value` text NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `app_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `app_config_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `base_keywords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`keyword` varchar(256) NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `base_keywords_id` PRIMARY KEY(`id`),
	CONSTRAINT `base_keywords_keyword_unique` UNIQUE(`keyword`)
);
--> statement-breakpoint
CREATE TABLE `content_gaps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`gapTitle` varchar(256) NOT NULL,
	`gapDescription` text NOT NULL,
	`suggestedKeywords` json NOT NULL DEFAULT ('[]'),
	`priority` enum('high','medium','low') NOT NULL DEFAULT 'medium',
	`hubspotPostsAnalyzed` int NOT NULL DEFAULT 0,
	`category` varchar(128),
	`runDate` varchar(16) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `content_gaps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `keywords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`keyword` varchar(256) NOT NULL,
	`searchIntent` enum('informational','navigational','commercial','transactional') NOT NULL DEFAULT 'informational',
	`estimatedVolume` int NOT NULL DEFAULT 0,
	`difficulty` int NOT NULL DEFAULT 0,
	`cpcAud` float DEFAULT 0,
	`relatedTopics` json NOT NULL DEFAULT ('[]'),
	`isBase` boolean NOT NULL DEFAULT false,
	`trending` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `keywords_id` PRIMARY KEY(`id`),
	CONSTRAINT `keywords_keyword_unique` UNIQUE(`keyword`)
);
--> statement-breakpoint
CREATE TABLE `removed_topics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`topicHash` varchar(64) NOT NULL,
	`removedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `removed_topics_id` PRIMARY KEY(`id`),
	CONSTRAINT `removed_topics_topicHash_unique` UNIQUE(`topicHash`)
);
--> statement-breakpoint
CREATE TABLE `research_summaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runDate` varchar(16) NOT NULL,
	`newsItems` json NOT NULL DEFAULT ('[]'),
	`trends` json NOT NULL DEFAULT ('[]'),
	`competitorActivity` json NOT NULL DEFAULT ('[]'),
	`overallSummary` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `research_summaries_id` PRIMARY KEY(`id`),
	CONSTRAINT `research_summaries_runDate_unique` UNIQUE(`runDate`)
);
--> statement-breakpoint
CREATE TABLE `topics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` varchar(128) NOT NULL,
	`topic` text NOT NULL,
	`keywords` json NOT NULL DEFAULT ('[]'),
	`brief` json NOT NULL DEFAULT ('[]'),
	`score` float NOT NULL DEFAULT 0,
	`status` enum('new','approved','removed') NOT NULL DEFAULT 'new',
	`publishedBlog` boolean NOT NULL DEFAULT false,
	`publishedSocial` boolean NOT NULL DEFAULT false,
	`topicHash` varchar(64) NOT NULL,
	`sourceDate` timestamp NOT NULL DEFAULT (now()),
	`removedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `topics_id` PRIMARY KEY(`id`)
);
