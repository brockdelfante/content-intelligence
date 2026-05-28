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

## Deployment (Next Steps)
- [x] Push to GitHub (new private repo: brockdelfante/content-intelligence-hub)
- [x] Save checkpoint for publish (version: 762750aa - latest with UI refinements)
- [ ] User clicks Publish button in Management UI to deploy
- [ ] After deploy: Create midnight cron: manus-heartbeat create --name daily-agent --cron "0 0 14 * * *" --path /api/scheduled/daily-agent

## News Enrichment Update
- [x] Agent: filter news to last 14 days only; add publishedDate, publication, url fields to newsItems
- [x] Agent: update LLM prompt to return publishedDate, publication, url for each news item
- [x] DB schema: update research_summaries.newsItems JSON shape to include publishedDate, publication, url
- [x] Research tab: show date, publication name, and link button for each news item
- [x] Topic Queue tab: show date, publication name, and link button for each supporting news item


## UI Theme & Typography Update
- [x] Switch theme from dark to light (update ThemeProvider, CSS variables in index.css)
- [x] Increase font sizes across dashboard (headings, body, labels)

## Social Post Scheduler Feature
- [x] Backend: tRPC procedure to generate social media captions via LLM
- [x] Backend: tRPC procedure to fetch HubSpot social accounts
- [x] Backend: tRPC procedure to schedule post to HubSpot social
- [x] Frontend: "Post to Social" button on each topic
- [x] Frontend: Social scheduler modal with caption selection, account picker, date/time picker
- [x] Frontend: Schedule button that calls HubSpot API and closes modal
- [x] Tests: caption generation, HubSpot account fetch, post scheduling


## UI Refinements (Current)
- [x] Increase font sizes further across dashboard (base font, headings, labels, table text)
- [x] Fix table width: constrain to max screen width, reduce category column width
- [x] Highlight news-backed topics with faint orange background
- [x] Fix remove button overflow issue (table now has overflow-x-auto with min-w-full)


## Auth Removal
- [x] Remove Manus OAuth from App.tsx and DashboardLayout
- [x] Remove auth check from Dashboard page
- [x] Update tRPC procedures: change protectedProcedure to publicProcedure where applicable
- [x] Remove useAuth hook calls from components
- [x] Remove login/logout buttons and user profile display
- [x] Update Home.tsx to redirect directly to Dashboard (no login page)


## Content Gaps Summary Card
- [ ] Add summary card at top of Content Gaps tab showing LinkedIn posts and blog articles analysed
- [ ] Display count of LinkedIn posts and blog articles
- [ ] Show 2 most recent titles from each source
