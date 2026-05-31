import { COOKIE_NAME } from "@shared/const";
import type { TrpcContext } from "./_core/context";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { runDailyAgent } from "./agent/agentRunner";
import { invokeLLM } from "./_core/llm";
import {
  approveTopic,
  clearUserTopics,
  deleteUserTopic,
  getLastAgentRun,
  listAgentRuns,
  listBaseKeywords,
  listContentGaps,
  listKeywords,
  listResearchSummaries,
  listTopics,
  listUserTopics,
  removeTopic,
  saveBaseKeywords,
  saveUserTopic,
  updateTopicPublished,
} from "./db";

// ─── Topics Router ────────────────────────────────────────────────────────────

const topicsRouter = router({
  list: publicProcedure
    .input(
      z.object({
        status: z.enum(["new", "approved", "removed"]).optional(),
        category: z.string().optional(),
      }).optional()
    )
    .query(({ input }) => listTopics(input)),

  approve: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => approveTopic(input.id)),

  remove: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => removeTopic(input.id)),

  updatePublished: publicProcedure
    .input(
      z.object({
        id: z.number(),
        field: z.enum(["publishedBlog", "publishedSocial"]),
        value: z.boolean(),
      })
    )
    .mutation(({ input }) => updateTopicPublished(input.id, input.field, input.value)),
});

// ─── Research Router ──────────────────────────────────────────────────────────

const researchRouter = router({
  list: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(90).optional() }).optional())
    .query(({ input }) => listResearchSummaries(input?.limit ?? 30)),
});

// ─── Keywords Router ──────────────────────────────────────────────────────────

const keywordsRouter = router({
  list: publicProcedure
    .input(z.object({ isBase: z.boolean().optional() }).optional())
    .query(({ input }) => listKeywords(input?.isBase)),
});

// ─── Content Gaps Router ──────────────────────────────────────────────────────

const contentGapsRouter = router({
  list: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(100).optional() }).optional())
    .query(({ input }) => listContentGaps(input?.limit ?? 50)),
});

// ─── Base Keywords Router ─────────────────────────────────────────────────────

const baseKeywordsRouter = router({
  list: publicProcedure.query(() => listBaseKeywords()),

  save: publicProcedure
    .input(z.object({ keywords: z.array(z.string()).max(40) }))
    .mutation(({ input }) => saveBaseKeywords(input.keywords)),
});

// ─── Agent Router ─────────────────────────────────────────────────────────────

const agentRouter = router({
  triggerRun: publicProcedure.mutation(async () => {
    const hubspotKey = process.env.HUBSPOT_API_KEY;
    // Run with a 110s timeout guard (Cloud Run limit is 180s, leave buffer)
    const timeout = new Promise<{ started: boolean; message: string }>((resolve) =>
      setTimeout(() => resolve({ started: true, message: "Agent is still running in the background — check the run log for results." }), 110_000)
    );
    const run = runDailyAgent(hubspotKey).then(() => ({
      started: true,
      message: "Agent run completed successfully",
    }));
    return Promise.race([run, timeout]);
  }),

  getLastRun: publicProcedure.query(() => getLastAgentRun()),

  listRuns: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(30).optional() }).optional())
    .query(({ input }) => listAgentRuns(input?.limit ?? 10)),
});

// ─── Social Router ────────────────────────────────────────────────────────────

const socialRouter = router({
  generateCaptions: publicProcedure
    .input(
      z.object({
        topic: z.string(),
        keywords: z.array(z.string()),
        brief: z.array(z.string()),
      })
    )
    .mutation(async ({ input }) => {
      const prompt = `Generate 3 compelling social media captions for the following Australian property finance topic. Each caption should be 1-2 sentences, engaging, and suitable for LinkedIn or Twitter. Include relevant hashtags.

Topic: ${input.topic}
Keywords: ${input.keywords.join(", ")}
Brief: ${input.brief.join(" ")}

Return as JSON array with 'caption' field for each.`;

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "You are a social media expert for Australian property finance. Generate engaging captions.",
          },
          { role: "user", content: prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "social_captions",
            strict: true,
            schema: {
              type: "object",
              properties: {
                captions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      caption: { type: "string" },
                    },
                    required: ["caption"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["captions"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices[0]?.message.content;
      if (!content) throw new Error("No captions generated");
      const contentStr = typeof content === "string" ? content : JSON.stringify(content);
      const parsed = JSON.parse(contentStr);
      return parsed.captions || [];
    }),

  getHubSpotAccounts: publicProcedure.query(async () => {
    const apiKey = process.env.HUBSPOT_API_KEY;
    if (!apiKey) return [];

    try {
      const res = await fetch("https://api.hubapi.com/crm/v3/objects/social_channel", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return [];
      const data = (await res.json()) as { results?: Array<{ id: string; properties: Record<string, unknown> }> };
      return (
        data.results?.map((r) => ({
          id: r.id,
          name: (r.properties.channel_name as string) || r.id,
        })) || []
      );
    } catch {
      return [];
    }
  }),

  schedulePost: publicProcedure
    .input(
      z.object({
        accountId: z.string(),
        caption: z.string(),
        scheduledTime: z.string(), // ISO 8601
      })
    )
    .mutation(async ({ input }) => {
      const apiKey = process.env.HUBSPOT_API_KEY;
      if (!apiKey) throw new Error("HubSpot API key not configured");

      const res = await fetch("https://api.hubapi.com/crm/v3/objects/social_post", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          properties: {
            hs_social_channel: input.accountId,
            hs_social_body: input.caption,
            hs_publish_date: new Date(input.scheduledTime).getTime(),
            hs_social_is_scheduled: "true",
          },
        }),
      });

      if (!res.ok) {
        const err = (await res.json()) as { message?: string };
        throw new Error(`HubSpot API error: ${err.message || "Unknown error"}`);
      }

      return { success: true, message: "Post scheduled successfully" };
    }),
});

// ─── App Router ───────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  topics: topicsRouter,
  research: researchRouter,
  keywords: keywordsRouter,
  contentGaps: contentGapsRouter,
  baseKeywords: baseKeywordsRouter,
  agent: agentRouter,
  social: socialRouter,
  userTopics: router({
    list: publicProcedure.query(() => listUserTopics()),
    save: publicProcedure
      .input(
        z.object({
          topicType: z.enum(["social", "article"]),
          topicTitle: z.string().min(1),
          newsSourceTitle: z.string().optional(),
        })
      )
      .mutation(({ input }) => saveUserTopic(input)),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteUserTopic(input.id)),
    clear: publicProcedure
      .input(z.object({ topicType: z.enum(["social", "article"]) }))
      .mutation(({ input }) => clearUserTopics(input.topicType)),
    generateSuggestions: publicProcedure
      .input(
        z.object({
          newsTitle: z.string(),
          newsContent: z.string(),
          topicType: z.enum(["social", "article"]),
        })
      )
      .mutation(async ({ input }) => {
        const prompt =
          input.topicType === "social"
            ? `Given this news article, generate 5 compelling social media post topics/titles that would resonate on LinkedIn. Each should be 5-12 words, actionable, and leverage the news angle. Return as JSON array of strings: ["topic1", "topic2", ...]. Article: ${input.newsTitle} - ${input.newsContent}`
            : `Given this news article, generate 5 blog article topics/titles that would provide in-depth analysis. Each should be 8-15 words, SEO-friendly, and position the content as authoritative. Return as JSON array of strings: ["topic1", "topic2", ...]. Article: ${input.newsTitle} - ${input.newsContent}`;

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a content strategist. Generate creative, relevant topics based on news articles.",
            },
            { role: "user", content: prompt },
          ],
        });

        const content = (response.choices[0]?.message.content || "[]") as string;
        try {
          const topics = JSON.parse(content);
          return Array.isArray(topics) ? topics.slice(0, 5) : [];
        } catch {
          return [];
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
