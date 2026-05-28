/**
 * Daily AI Agent Runner
 * Orchestrates: news research → keyword research → HubSpot gap analysis → topic ranking → DB upsert
 */
import { invokeLLM } from "../_core/llm";
import {
  createAgentRun,
  listBaseKeywords,
  updateAgentRun,
  upsertContentGap,
  upsertKeyword,
  upsertResearchSummary,
  upsertTopic,
} from "../db";

const CATEGORIES = [
  "Education & Finance Explainers",
  "Market Intelligence",
  "Investment & Returns",
  "Developer Finance",
  "Social Proof & Track Record",
  "Process & Behind the Scenes",
  "Refinance & Alternative Lending",
  "Partner & Broker Content",
  "News and Current Events",
];

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function hashTopic(topic: string): string {
  // Simple deterministic hash for deduplication
  let hash = 0;
  const normalized = topic.toLowerCase().trim().replace(/\s+/g, " ");
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

// ─── Real web search helper ─────────────────────────────────────────────────

async function webSearch(query: string): Promise<{ title: string; link: string; snippet: string }[]> {
  try {
    const apiKey = process.env.LLMLAYER_API_KEY;
    if (!apiKey) return [];
    const response = await fetch("https://api.llmlayer.dev/api/v2/web_search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, search_type: "news", location: "au" }),
    });
    if (!response.ok) return [];
    const data = (await response.json()) as any;
    return (data.results ?? []).slice(0, 8);
  } catch {
    return [];
  }
}

// ─── Step 1: Research Australian news & trends ────────────────────────────────

async function researchNews(baseKeywords: string[]): Promise<{
  newsItems: { title: string; source: string; summary: string; url?: string; publishedDate?: string; publication?: string }[];
  trends: { trend: string; relevance: string }[];
  competitorActivity: { competitor: string; activity: string; topics: string[] }[];
  overallSummary: string;
}> {
  const keywordSample = baseKeywords.slice(0, 15).join(", ");

  // Fetch real news from web search (last 14 days)
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 14);
  const cutoffStr = cutoffDate.toISOString().split("T")[0];

  const searchQueries = [
    "Australian property finance news site:afr.com OR site:theaustralian.com.au OR site:smh.com.au OR site:abc.net.au",
    "RBA interest rate property development Australia 2025",
    "non-bank lender construction finance bridging loan Australia 2025",
  ];
  const searchResults = await Promise.all(searchQueries.map((q) => webSearch(q)));
  const flatResults = searchResults.flat();
  const realNewsContext = flatResults.length > 0
    ? `Real news search results (only include items published on or after ${cutoffStr}):\n${flatResults
        .map((r) => `- TITLE: ${r.title} | SNIPPET: ${r.snippet} | URL: ${r.link}`)
        .join("\n")}`
    : "No live search results available — use your knowledge of recent Australian property finance news from the last 14 days.";

  const prompt = `You are a content intelligence analyst specialising in Australian property finance.

Today is ${getTodayDate()}.

${realNewsContext}

Based on the above real news data and your knowledge, synthesise the following for the Australian property finance sector:

1. **Recent News** (published within the last 14 days only — cutoff: ${cutoffStr}): Key news items relevant to: ${keywordSample}
   Focus on: RBA decisions, APRA changes, construction finance, development lending, private credit, non-bank lending, property market updates.
   IMPORTANT RULES:
   - Only include news published on or after ${cutoffStr}. Exclude anything older.
   - For each news item, extract the publication name from the URL domain (e.g. afr.com → "Australian Financial Review", abc.net.au → "ABC News", smh.com.au → "Sydney Morning Herald", theaustralian.com.au → "The Australian", realestate.com.au → "realestate.com.au", domain.com.au → "Domain").
   - Use the exact URL from the search results above where available.
   - Estimate the published date from the snippet or URL date patterns; if unknown use today's date minus a reasonable estimate (max 14 days ago). Format as YYYY-MM-DD.

2. **Industry Trends**: Emerging trends in Australian property finance, construction lending, private credit, and alternative lending.

3. **Competitor Content Activity**: What topics are Australian non-bank lenders, private credit funds, and property finance brokers publishing content about? (e.g., La Trobe Financial, Pepper Money, Liberty Financial, Metrics Credit Partners, MaxCap, Qualitas)

Return a JSON object with this exact structure:
{
  "newsItems": [
    { "title": "...", "source": "...", "summary": "...", "url": "https://...", "publishedDate": "YYYY-MM-DD", "publication": "Full Publication Name" }
  ],
  "trends": [
    { "trend": "...", "relevance": "..." }
  ],
  "competitorActivity": [
    { "competitor": "...", "activity": "...", "topics": ["..."] }
  ],
  "overallSummary": "2-3 sentence executive summary of today's content landscape"
}

Return 5-8 news items, 4-6 trends, 3-5 competitor entries. Be specific and factual.`;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "You are a specialist content intelligence analyst for Australian property finance. Return only valid JSON.",
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" } as any,
  });

  const rawContent = response.choices[0]?.message?.content;
  const content = typeof rawContent === "string" ? rawContent : "{}";
  try {
    const parsed = JSON.parse(content);
    // Server-side enforcement: discard any news items older than 14 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);
    const filteredNews = (parsed.newsItems ?? []).filter((item: any) => {
      if (!item.publishedDate) return true; // keep if no date (LLM omitted it)
      const d = new Date(item.publishedDate);
      return !isNaN(d.getTime()) && d >= cutoff;
    });
    return { ...parsed, newsItems: filteredNews };
  } catch {
    return {
      newsItems: [],
      trends: [],
      competitorActivity: [],
      overallSummary: "Research data unavailable for today.",
    };
  }
}

// ─── Step 2: Keyword research ─────────────────────────────────────────────────

async function researchKeywords(baseKeywords: string[]): Promise<
  {
    keyword: string;
    searchIntent: "informational" | "navigational" | "commercial" | "transactional";
    estimatedVolume: number;
    difficulty: number;
    cpcAud: number;
    relatedTopics: string[];
    trending: boolean;
  }[]
> {
  const prompt = `You are an SEO specialist for Australian property finance.

Analyse these seed keywords and expand them with research data:
${baseKeywords.join("\n")}

For each keyword (and suggest 10-15 additional high-value related keywords), provide:
- Realistic Australian monthly search volume estimates
- SEO difficulty score (0-100, where 100 is hardest)
- Search intent classification
- Estimated CPC in AUD
- Whether it's currently trending
- Related topic areas

Focus on: construction finance, development lending, private credit, non-bank lending, bridging loans, mezzanine finance.

Return JSON array:
[
  {
    "keyword": "...",
    "searchIntent": "informational|navigational|commercial|transactional",
    "estimatedVolume": 0,
    "difficulty": 0,
    "cpcAud": 0.00,
    "relatedTopics": ["..."],
    "trending": false
  }
]`;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are an SEO specialist for Australian property finance. Return only valid JSON array.",
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" } as any,
  });

  const rawContent2 = response.choices[0]?.message?.content;
  const content = typeof rawContent2 === "string" ? rawContent2 : "[]";
  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : parsed.keywords ?? [];
  } catch {
    return [];
  }
}

// ─── Step 3: HubSpot content gap analysis ────────────────────────────────────

async function analyseHubSpotGaps(
  hubspotApiKey: string | undefined,
  baseKeywords: string[]
): Promise<{
  gaps: {
    gapTitle: string;
    gapDescription: string;
    suggestedKeywords: string[];
    priority: "high" | "medium" | "low";
    category: string;
  }[];
  postsAnalyzed: number;
  blogPostsCount: number;
  socialPostsCount: number;
  recentBlogTitles: string[];
  recentSocialTitles: string[];
}> {
  let publishedTopics: string[] = [];
  let postsAnalyzed = 0;
  let allPosts: any[] = [];
  let socialTopics: string[] = [];

  // Fetch HubSpot blog posts + social broadcasts if API key available
  if (hubspotApiKey) {
    try {
      // 1. Blog posts (paginated, up to 200)
      let after: string | undefined;
      for (let page = 0; page < 4; page++) {
        const url = new URL("https://api.hubapi.com/cms/v3/blogs/posts");
        url.searchParams.set("limit", "50");
        url.searchParams.set("archived", "false");
        if (after) url.searchParams.set("after", after);
        const response = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${hubspotApiKey}` },
        });
        if (!response.ok) break;
        const data = (await response.json()) as any;
        const results = data.results ?? [];
        allPosts = allPosts.concat(results);
        after = data.paging?.next?.after;
        if (!after || results.length === 0) break;
      }
      publishedTopics = allPosts
        .map((p: any) => p.name ?? p.htmlTitle ?? "")
        .filter(Boolean);

      // 2. Social broadcasts (published social posts)
      try {
        const socialRes = await fetch(
          "https://api.hubapi.com/broadcast/v1/broadcasts?limit=100",
          { headers: { Authorization: `Bearer ${hubspotApiKey}` } }
        );
        if (socialRes.ok) {
          const socialData = (await socialRes.json()) as any;
          const broadcasts = Array.isArray(socialData) ? socialData : (socialData.broadcasts || []);
          if (Array.isArray(broadcasts)) {
            socialTopics = broadcasts
              .map((b: any) => b.content?.body ?? b.content?.originalBody ?? b.message ?? "")
              .filter((s: string) => s.length > 10)
              .slice(0, 100);
          }
        }
      } catch {
        // social fetch optional — ignore errors
      }

      postsAnalyzed = allPosts.length + socialTopics.length;
      // Combine blog titles + social post text for gap analysis
      if (socialTopics.length > 0) {
        publishedTopics = [
          ...publishedTopics,
          ...socialTopics.map((t) => `[Social] ${t.slice(0, 120)}`),
        ];
      }
    } catch (err) {
      console.warn("[Agent] HubSpot fetch failed:", err);
    }
  }

  const publishedList =
    publishedTopics.length > 0
      ? `Previously published content (blog posts and social media):\n${publishedTopics.slice(0, 80).join("\n")}`
      : "No HubSpot content data available — analyse based on typical Australian property finance content gaps for a non-bank lender.";

  const prompt = `You are a content strategist for an Australian non-bank property finance lender.

${publishedList}

Seed keywords scope: ${baseKeywords.slice(0, 20).join(", ")}

Identify 6-10 significant content gaps — topics that are under-covered or missing entirely based on:
1. The published content above (or typical gaps in this sector)
2. SEO opportunity (high search volume, lower competition)
3. E-E-A-T signals (Experience, Expertise, Authoritativeness, Trustworthiness)
4. AI visibility (topics LLMs are frequently asked about in property finance)
5. Social shareability for LinkedIn/Instagram in the finance space

Categories to consider: ${CATEGORIES.join(", ")}

Return JSON:
{
  "gaps": [
    {
      "gapTitle": "...",
      "gapDescription": "2-3 sentence description of the gap and why it matters",
      "suggestedKeywords": ["keyword1", "keyword2"],
      "priority": "high|medium|low",
      "category": "one of the categories above"
    }
  ]
}`;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "You are a content strategy expert for Australian property finance. Return only valid JSON.",
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" } as any,
  });

  const rawContent3 = response.choices[0]?.message?.content;
  const content = typeof rawContent3 === "string" ? rawContent3 : "{}";
  try {
    const parsed = JSON.parse(content);
    return {
      gaps: parsed.gaps ?? [],
      postsAnalyzed,
      blogPostsCount: allPosts?.length ?? 0,
      socialPostsCount: socialTopics?.length ?? 0,
      recentBlogTitles: (allPosts ?? []).slice(0, 2).map((p: any) => p.name ?? p.htmlTitle ?? "").filter(Boolean),
      recentSocialTitles: (socialTopics ?? []).slice(0, 2),
    };
  } catch {
    return {
      gaps: [],
      postsAnalyzed,
      blogPostsCount: allPosts?.length ?? 0,
      socialPostsCount: socialTopics?.length ?? 0,
      recentBlogTitles: (allPosts ?? []).slice(0, 2).map((p: any) => p.name ?? p.htmlTitle ?? "").filter(Boolean),
      recentSocialTitles: (socialTopics ?? []).slice(0, 2),
    };
  }
}

// ─── Step 4: Generate & rank topics ──────────────────────────────────────────

async function generateAndRankTopics(
  newsData: Awaited<ReturnType<typeof researchNews>>,
  keywordData: Awaited<ReturnType<typeof researchKeywords>>,
  baseKeywords: string[]
): Promise<
  {
    category: string;
    topic: string;
    keywords: string[];
    brief: string[];
    score: number;
    topicHash: string;
    sourceDate: Date;
    sourceNews?: { title: string; publication: string; publishedDate: string; url: string }[];
  }[]
> {
  const newsContext = newsData.newsItems
    .slice(0, 8)
    .map((n, i) => `[${i}] ${n.title} | ${n.publication ?? n.source} | ${n.publishedDate ?? "recent"} | ${n.url ?? ""}`)
    .join("\n");
  const trendContext = newsData.trends
    .slice(0, 4)
    .map((t) => `- ${t.trend}`)
    .join("\n");
  const topKeywords = keywordData
    .sort((a, b) => b.estimatedVolume - a.estimatedVolume)
    .slice(0, 15)
    .map((k) => k.keyword)
    .join(", ");

  const prompt = `You are a content strategist for an Australian non-bank property finance lender targeting developers, investors, and brokers.

Today's news context:
${newsContext}

Current trends:
${trendContext}

High-value keywords: ${topKeywords}
Base keywords: ${baseKeywords.slice(0, 15).join(", ")}

Generate 12-18 blog/social media topic recommendations. Apply these ranking signals:

SCORING CRITERIA (each 0-20 points, total 0-100):
1. SEO Opportunity: search volume × (1 - difficulty/100) for target keywords
2. E-E-A-T Signal: does this demonstrate experience/expertise/authority/trust?
3. Featured Snippet Potential: "How X works", "What is X", comparison, step-by-step formats
4. Social Shareability: LinkedIn engagement potential for finance professionals
5. AI Citation Likelihood: topics LLMs are frequently asked about (private credit, construction finance explainers, RBA impact)

Categories: ${CATEGORIES.join(" | ")}

Return JSON array:
[
  {
    "category": "...",
    "topic": "Specific, compelling topic title",
    "keywords": ["primary keyword", "secondary keyword", "tertiary keyword"],
    "brief": [
      "Key angle or hook for this piece",
      "Main point or argument to make",
      "Call to action or audience takeaway"
    ],
    "score": 85.5,
    "sourceNewsIndices": [0, 2]
  }
]

For "sourceNewsIndices": include the index numbers (from the news list above) of any news items that directly inspired or support this topic. Use [] if no specific news item applies.
Ensure at least 1-2 "News and Current Events" topics if news is time-sensitive. Sort by score descending.`;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "You are a content strategy expert for Australian property finance. Return only valid JSON array.",
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" } as any,
  });

  const rawContent4 = response.choices[0]?.message?.content;
  const content = typeof rawContent4 === "string" ? rawContent4 : "[]";
  try {
    const parsed = JSON.parse(content);
    const topicsArray = Array.isArray(parsed) ? parsed : parsed.topics ?? [];
    const now = new Date();
    const newsItems = newsData.newsItems;
    return topicsArray.map((t: any) => {
      // Map sourceNewsIndices back to full news objects
      const indices: number[] = Array.isArray(t.sourceNewsIndices) ? t.sourceNewsIndices : [];
      const sourceNews = indices
        .filter((i) => i >= 0 && i < newsItems.length)
        .map((i) => ({
          title: newsItems[i].title,
          publication: newsItems[i].publication ?? newsItems[i].source ?? "Unknown",
          publishedDate: newsItems[i].publishedDate ?? now.toISOString().split("T")[0],
          url: newsItems[i].url ?? "",
        }))
        .filter((n) => n.title);
      return {
        category: t.category ?? "Market Intelligence",
        topic: t.topic ?? "",
        keywords: Array.isArray(t.keywords) ? t.keywords : [],
        brief: Array.isArray(t.brief) ? t.brief : [],
        score: typeof t.score === "number" ? t.score : 50,
        topicHash: hashTopic(t.topic ?? ""),
        sourceDate: now,
        sourceNews: sourceNews.length > 0 ? sourceNews : undefined,
      };
    });
  } catch {
    return [];
  }
}

// ─── Main Orchestrator ────────────────────────────────────────────────────────

export async function runDailyAgent(hubspotApiKey?: string): Promise<{
  success: boolean;
  topicsAdded: number;
  keywordsUpdated: number;
  gapsFound: number;
  summary: string;
  error?: string;
}> {
  const runDate = getTodayDate();
  await createAgentRun(runDate);

  try {
    // Load base keywords
    const baseKwRows = await listBaseKeywords();
    const baseKwList = baseKwRows.map((r) => r.keyword);

    console.log(`[Agent] Starting daily run for ${runDate} with ${baseKwList.length} base keywords`);

    // Step 1: News research
    console.log("[Agent] Step 1: Researching news and trends...");
    const newsData = await researchNews(baseKwList);
    await upsertResearchSummary({ runDate, ...newsData });

    // Step 2: Keyword research
    console.log("[Agent] Step 2: Researching keywords...");
    const kwData = await researchKeywords(baseKwList);
    let keywordsUpdated = 0;
    for (const kw of kwData) {
      if (kw.keyword) {
        await upsertKeyword({
          keyword: kw.keyword,
          searchIntent: kw.searchIntent ?? "informational",
          estimatedVolume: kw.estimatedVolume ?? 0,
          difficulty: kw.difficulty ?? 0,
          cpcAud: kw.cpcAud ?? 0,
          relatedTopics: kw.relatedTopics ?? [],
          trending: kw.trending ?? false,
        });
        keywordsUpdated++;
      }
    }

    // Step 3: HubSpot content gap analysis
    console.log("[Agent] Step 3: Analysing HubSpot content gaps...");
    const gapData = await analyseHubSpotGaps(hubspotApiKey, baseKwList);
    for (const gap of gapData.gaps) {
      await upsertContentGap({
        gapTitle: gap.gapTitle,
        gapDescription: gap.gapDescription,
        suggestedKeywords: gap.suggestedKeywords,
        priority: gap.priority,
        hubspotPostsAnalyzed: gapData.postsAnalyzed,
        category: gap.category,
        runDate,
      });
    }

    // Step 4: Generate and rank topics
    console.log("[Agent] Step 4: Generating and ranking topics...");
    const topicsData = await generateAndRankTopics(newsData, kwData, baseKwList);
    let topicsAdded = 0;
    for (const topic of topicsData) {
      await upsertTopic(topic);
      topicsAdded++;
    }

    const summary = `Daily agent completed successfully. Added/updated ${topicsAdded} topics, ${keywordsUpdated} keywords, identified ${gapData.gaps.length} content gaps. ${newsData.overallSummary}`;

    await updateAgentRun(runDate, {
      status: "success",
      topicsAdded,
      keywordsUpdated,
      gapsFound: gapData.gaps.length,
      summary,
    });

    console.log(`[Agent] Run complete: ${summary}`);
    return { success: true, topicsAdded, keywordsUpdated, gapsFound: gapData.gaps.length, summary };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[Agent] Run failed:", errorMsg);
    await updateAgentRun(runDate, { status: "failed", error: errorMsg });
    return {
      success: false,
      topicsAdded: 0,
      keywordsUpdated: 0,
      gapsFound: 0,
      summary: "Agent run failed",
      error: errorMsg,
    };
  }
}
