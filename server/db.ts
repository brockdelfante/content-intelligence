import { and, desc, eq, gte, lt, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  agentRuns,
  appConfig,
  baseKeywords,
  contentGaps,
  keywords,
  removedTopics,
  researchSummaries,
  topics,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach((field) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  });
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

// ─── Topics ───────────────────────────────────────────────────────────────────

export async function listTopics(filter?: {
  status?: "new" | "approved" | "removed";
  category?: string;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filter?.status) conditions.push(eq(topics.status, filter.status));
  if (filter?.category) conditions.push(eq(topics.category, filter.category));
  return db
    .select()
    .from(topics)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(topics.score), desc(topics.createdAt));
}

export async function approveTopic(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(topics).set({ status: "approved" }).where(eq(topics.id, id));
}

export async function removeTopic(id: number) {
  const db = await getDb();
  if (!db) return;
  const now = new Date();
  // Get the topic hash first
  const topic = await db.select().from(topics).where(eq(topics.id, id)).limit(1);
  if (topic[0]) {
    await db
      .insert(removedTopics)
      .values({ topicHash: topic[0].topicHash, removedAt: now })
      .onDuplicateKeyUpdate({ set: { removedAt: now } });
  }
  await db.update(topics).set({ status: "removed", removedAt: now }).where(eq(topics.id, id));
}

export async function updateTopicPublished(
  id: number,
  field: "publishedBlog" | "publishedSocial",
  value: boolean
) {
  const db = await getDb();
  if (!db) return;
  await db.update(topics).set({ [field]: value }).where(eq(topics.id, id));
}

export async function upsertTopic(data: {
  category: string;
  topic: string;
  keywords: string[];
  brief: string[];
  score: number;
  topicHash: string;
  sourceDate: Date;
}) {
  const db = await getDb();
  if (!db) return;

  // Check if topic hash is in removed list (within 3 months)
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const removed = await db
    .select()
    .from(removedTopics)
    .where(
      and(
        eq(removedTopics.topicHash, data.topicHash),
        gte(removedTopics.removedAt, threeMonthsAgo)
      )
    )
    .limit(1);
  if (removed.length > 0) return; // suppressed

  // Check if topic already exists
  const existing = await db
    .select()
    .from(topics)
    .where(eq(topics.topicHash, data.topicHash))
    .limit(1);

  if (existing.length > 0) {
    // Update score only if not removed/approved
    if (existing[0].status === "new") {
      await db
        .update(topics)
        .set({ score: data.score, keywords: data.keywords, brief: data.brief })
        .where(eq(topics.topicHash, data.topicHash));
    }
  } else {
    await db.insert(topics).values({
      ...data,
      status: "new",
      publishedBlog: false,
      publishedSocial: false,
    });
  }
}

// ─── Research Summaries ───────────────────────────────────────────────────────

export async function listResearchSummaries(limit = 30) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(researchSummaries)
    .orderBy(desc(researchSummaries.runDate))
    .limit(limit);
}

export async function getResearchSummaryByDate(runDate: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(researchSummaries)
    .where(eq(researchSummaries.runDate, runDate))
    .limit(1);
  return result[0] ?? null;
}

export async function upsertResearchSummary(data: {
  runDate: string;
  newsItems: { title: string; source: string; summary: string; url?: string }[];
  trends: { trend: string; relevance: string }[];
  competitorActivity: { competitor: string; activity: string; topics: string[] }[];
  overallSummary: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(researchSummaries)
    .values(data)
    .onDuplicateKeyUpdate({
      set: {
        newsItems: data.newsItems,
        trends: data.trends,
        competitorActivity: data.competitorActivity,
        overallSummary: data.overallSummary,
      },
    });
}

// ─── Keywords ─────────────────────────────────────────────────────────────────

export async function listKeywords(isBase?: boolean) {
  const db = await getDb();
  if (!db) return [];
  const conditions = isBase !== undefined ? [eq(keywords.isBase, isBase)] : [];
  return db
    .select()
    .from(keywords)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(keywords.estimatedVolume));
}

export async function upsertKeyword(data: {
  keyword: string;
  searchIntent: "informational" | "navigational" | "commercial" | "transactional";
  estimatedVolume: number;
  difficulty: number;
  cpcAud?: number;
  relatedTopics: string[];
  isBase?: boolean;
  trending?: boolean;
}) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(keywords)
    .values({ ...data, isBase: data.isBase ?? false, trending: data.trending ?? false })
    .onDuplicateKeyUpdate({
      set: {
        searchIntent: data.searchIntent,
        estimatedVolume: data.estimatedVolume,
        difficulty: data.difficulty,
        cpcAud: data.cpcAud,
        relatedTopics: data.relatedTopics,
        trending: data.trending ?? false,
      },
    });
}

// ─── Base Keywords ────────────────────────────────────────────────────────────

export async function listBaseKeywords() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(baseKeywords).orderBy(baseKeywords.position);
}

export async function saveBaseKeywords(keywordList: string[]) {
  const db = await getDb();
  if (!db) return;
  // Delete all and re-insert with position
  await db.delete(baseKeywords);
  if (keywordList.length === 0) return;
  await db.insert(baseKeywords).values(
    keywordList
      .filter((k) => k.trim())
      .map((keyword, position) => ({ keyword: keyword.trim(), position }))
  );
}

// ─── Content Gaps ─────────────────────────────────────────────────────────────

export async function listContentGaps(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(contentGaps)
    .orderBy(desc(contentGaps.runDate), contentGaps.priority)
    .limit(limit);
}

export async function upsertContentGap(data: {
  gapTitle: string;
  gapDescription: string;
  suggestedKeywords: string[];
  priority: "high" | "medium" | "low";
  hubspotPostsAnalyzed: number;
  category?: string;
  runDate: string;
}) {
  const db = await getDb();
  if (!db) return;
  // Idempotent: check if same gap title already exists for this runDate
  const existing = await db
    .select()
    .from(contentGaps)
    .where(and(eq(contentGaps.runDate, data.runDate), eq(contentGaps.gapTitle, data.gapTitle)))
    .limit(1);
  if (existing.length > 0) {
    await db
      .update(contentGaps)
      .set({
        gapDescription: data.gapDescription,
        suggestedKeywords: data.suggestedKeywords,
        priority: data.priority,
        hubspotPostsAnalyzed: data.hubspotPostsAnalyzed,
        category: data.category,
      })
      .where(and(eq(contentGaps.runDate, data.runDate), eq(contentGaps.gapTitle, data.gapTitle)));
  } else {
    await db.insert(contentGaps).values(data);
  }
}

// ─── Agent Runs ───────────────────────────────────────────────────────────────

export async function createAgentRun(runDate: string) {
  const db = await getDb();
  if (!db) return null;
  // Idempotent: upsert by runDate
  await db
    .insert(agentRuns)
    .values({ runDate, status: "running", topicsAdded: 0, keywordsUpdated: 0, gapsFound: 0 })
    .onDuplicateKeyUpdate({ set: { status: "running", error: null } });
  return true;
}

export async function updateAgentRun(
  runDate: string,
  data: {
    status: "success" | "failed";
    topicsAdded?: number;
    keywordsUpdated?: number;
    gapsFound?: number;
    summary?: string;
    error?: string;
  }
) {
  const db = await getDb();
  if (!db) return;
  await db.update(agentRuns).set(data).where(eq(agentRuns.runDate, runDate));
}

export async function getLastAgentRun() {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(agentRuns)
    .orderBy(desc(agentRuns.createdAt))
    .limit(1);
  return result[0] ?? null;
}

export async function listAgentRuns(limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agentRuns).orderBy(desc(agentRuns.createdAt)).limit(limit);
}

// ─── App Config ───────────────────────────────────────────────────────────────

export async function getConfig(key: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(appConfig)
    .where(eq(appConfig.key, key))
    .limit(1);
  return result[0]?.value ?? null;
}

export async function setConfig(key: string, value: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(appConfig)
    .values({ key, value })
    .onDuplicateKeyUpdate({ set: { value } });
}
