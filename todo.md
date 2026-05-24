# Content Intelligence Hub — TODO

## Database Schema
- [x] topics table (id, category, topic, keywords, brief, score, status, publishedBlog, publishedSocial, removedAt, createdAt, updatedAt)
- [x] research_summaries table (id, runDate, newsItems, trends, competitorActivity, overallSummary, createdAt)
- [x] keywords table (id, keyword, searchIntent, estimatedVolume, difficulty, cpcAud, relatedTopics, isBase, trending, createdAt, updatedAt)
- [x] content_gaps table (id, gapTitle, gapDescription, suggestedKeywords, priority, hubspotPostsAnalyzed, category, runDate, createdAt)
- [x] agent_runs table (id, runDate, status, topicsAdded, keywordsUpdated, gapsFound, summary, error, createdAt)
- [x] removed_topics table (id, topicHash, removedAt) — prevents re-adding for 3 months
- [x] base_keywords table (id, keyword, position) — configurable agent scope
- [x] app_config table (id, key, value) — stores heartbeat task_uid and other config

## Backend Routers
- [x] topics router: list (with status/category filter), approve, remove, updatePublished
- [x] research router: list summaries by date
- [x] keywords router: list with SEO metrics
- [x] contentGaps router: list gaps
- [x] baseKeywords router: list, save
- [x] agent router: triggerRun (manual), getLastRun, listRuns
- [x] system heartbeat endpoint: /api/scheduled/daily-agent

## AI Agent Logic (server/agent/)
- [x] agentRunner.ts — orchestrates all steps, upserts to DB
- [x] Step 1: News & trends research via LLM
- [x] Step 2: Keyword research via LLM
- [x] Step 3: HubSpot content gap analysis (blog posts + social broadcasts, REST API with AI fallback)
- [x] Step 4: Topic generation & ranking with SEO/social/AI-visibility scoring

## Frontend Pages
- [x] Dashboard.tsx — sidebar layout with all nav items
- [x] TopicQueueTab — sortable/filterable table, approve/remove actions, status badges, score bar, published checkboxes
- [x] ResearchTab — date selector, news items, trends, competitor activity
- [x] KeywordsTab — table with SEO metrics (intent, volume, difficulty, CPC), stats row
- [x] ContentGapsTab — gap cards with priority badges, stats row, filter by priority/date
- [x] BaseKeywordsTab — 40 configurable base keywords
- [x] AgentStatusBar — last run status in header
- [x] Dark professional theme (OKLCH colour palette, Inter font)

## Scheduling
- [x] Heartbeat /api/scheduled/daily-agent endpoint (server/scheduledAgent.ts)
- [x] Registered in server/_core/index.ts
- [ ] Create midnight UTC daily cron via manus-heartbeat CLI (requires deployed site)

## Testing
- [x] Vitest tests: auth logout, topic hashing, scoring, keyword intent, content gap priority, base keywords (11 tests passing)

## Deployment
- [ ] Push to GitHub (new private repo)
- [ ] Save checkpoint for publish
- [ ] User clicks Publish button
- [ ] Create midnight cron after deploy: manus-heartbeat create --name daily-agent --cron "0 0 14 * * *" --path /api/scheduled/daily-agent
