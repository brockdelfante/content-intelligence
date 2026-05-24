import {
  boolean,
  float,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Topic Queue ───────────────────────────────────────────────────────────────

export const topics = mysqlTable("topics", {
  id: int("id").autoincrement().primaryKey(),
  category: varchar("category", { length: 128 }).notNull(),
  topic: text("topic").notNull(),
  keywords: json("keywords").$type<string[]>().notNull().default([]),
  brief: json("brief").$type<string[]>().notNull().default([]),
  score: float("score").notNull().default(0),
  status: mysqlEnum("status", ["new", "approved", "removed"]).default("new").notNull(),
  publishedBlog: boolean("publishedBlog").default(false).notNull(),
  publishedSocial: boolean("publishedSocial").default(false).notNull(),
  topicHash: varchar("topicHash", { length: 64 }).notNull(),
  sourceDate: timestamp("sourceDate").defaultNow().notNull(),
  sourceNews: json("sourceNews")
    .$type<{ title: string; publication: string; publishedDate: string; url: string }[]>()
    .default([]),
  removedAt: timestamp("removedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Topic = typeof topics.$inferSelect;
export type InsertTopic = typeof topics.$inferInsert;

// ─── Research Summaries ────────────────────────────────────────────────────────

export const researchSummaries = mysqlTable("research_summaries", {
  id: int("id").autoincrement().primaryKey(),
  runDate: varchar("runDate", { length: 16 }).notNull().unique(), // YYYY-MM-DD
  newsItems: json("newsItems")
    .$type<{ title: string; source: string; summary: string; url?: string; publishedDate?: string; publication?: string }[]>()
    .notNull()
    .default([]),
  trends: json("trends")
    .$type<{ trend: string; relevance: string }[]>()
    .notNull()
    .default([]),
  competitorActivity: json("competitorActivity")
    .$type<{ competitor: string; activity: string; topics: string[] }[]>()
    .notNull()
    .default([]),
  overallSummary: text("overallSummary"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ResearchSummary = typeof researchSummaries.$inferSelect;
export type InsertResearchSummary = typeof researchSummaries.$inferInsert;

// ─── Keywords ─────────────────────────────────────────────────────────────────

export const keywords = mysqlTable("keywords", {
  id: int("id").autoincrement().primaryKey(),
  keyword: varchar("keyword", { length: 256 }).notNull().unique(),
  searchIntent: mysqlEnum("searchIntent", ["informational", "navigational", "commercial", "transactional"])
    .default("informational")
    .notNull(),
  estimatedVolume: int("estimatedVolume").default(0).notNull(),
  difficulty: int("difficulty").default(0).notNull(), // 0–100
  cpcAud: float("cpcAud").default(0),
  relatedTopics: json("relatedTopics").$type<string[]>().notNull().default([]),
  isBase: boolean("isBase").default(false).notNull(), // true = user-defined base keyword
  trending: boolean("trending").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Keyword = typeof keywords.$inferSelect;
export type InsertKeyword = typeof keywords.$inferInsert;

// ─── Content Gaps ─────────────────────────────────────────────────────────────

export const contentGaps = mysqlTable("content_gaps", {
  id: int("id").autoincrement().primaryKey(),
  gapTitle: varchar("gapTitle", { length: 256 }).notNull(),
  gapDescription: text("gapDescription").notNull(),
  suggestedKeywords: json("suggestedKeywords").$type<string[]>().notNull().default([]),
  priority: mysqlEnum("priority", ["high", "medium", "low"]).default("medium").notNull(),
  hubspotPostsAnalyzed: int("hubspotPostsAnalyzed").default(0).notNull(),
  category: varchar("category", { length: 128 }),
  runDate: varchar("runDate", { length: 16 }).notNull(), // YYYY-MM-DD
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContentGap = typeof contentGaps.$inferSelect;
export type InsertContentGap = typeof contentGaps.$inferInsert;

// ─── Agent Runs ───────────────────────────────────────────────────────────────

export const agentRuns = mysqlTable("agent_runs", {
  id: int("id").autoincrement().primaryKey(),
  runDate: varchar("runDate", { length: 16 }).notNull(), // YYYY-MM-DD
  status: mysqlEnum("status", ["running", "success", "failed"]).default("running").notNull(),
  topicsAdded: int("topicsAdded").default(0).notNull(),
  keywordsUpdated: int("keywordsUpdated").default(0).notNull(),
  gapsFound: int("gapsFound").default(0).notNull(),
  summary: text("summary"),
  error: text("error"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AgentRun = typeof agentRuns.$inferSelect;
export type InsertAgentRun = typeof agentRuns.$inferInsert;

// ─── Removed Topics (suppress re-adding for 3 months) ────────────────────────

export const removedTopics = mysqlTable("removed_topics", {
  id: int("id").autoincrement().primaryKey(),
  topicHash: varchar("topicHash", { length: 64 }).notNull().unique(),
  removedAt: timestamp("removedAt").defaultNow().notNull(),
});

export type RemovedTopic = typeof removedTopics.$inferSelect;

// ─── App Config (stores heartbeat task_uid, etc.) ─────────────────────────────

export const appConfig = mysqlTable("app_config", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 128 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AppConfig = typeof appConfig.$inferSelect;

// ─── Base Keywords (user-managed, Tab 3) ─────────────────────────────────────

export const baseKeywords = mysqlTable("base_keywords", {
  id: int("id").autoincrement().primaryKey(),
  keyword: varchar("keyword", { length: 256 }).notNull().unique(),
  position: int("position").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BaseKeyword = typeof baseKeywords.$inferSelect;
export type InsertBaseKeyword = typeof baseKeywords.$inferInsert;
