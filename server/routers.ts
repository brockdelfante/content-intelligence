import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { runDailyAgent } from "./agent/agentRunner";
import {
  approveTopic,
  getLastAgentRun,
  listAgentRuns,
  listBaseKeywords,
  listContentGaps,
  listKeywords,
  listResearchSummaries,
  listTopics,
  removeTopic,
  saveBaseKeywords,
  updateTopicPublished,
} from "./db";

// ─── Topics Router ────────────────────────────────────────────────────────────

const topicsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["new", "approved", "removed"]).optional(),
        category: z.string().optional(),
      }).optional()
    )
    .query(({ input }) => listTopics(input)),

  approve: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => approveTopic(input.id)),

  remove: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => removeTopic(input.id)),

  updatePublished: protectedProcedure
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
  list: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(90).optional() }).optional())
    .query(({ input }) => listResearchSummaries(input?.limit ?? 30)),
});

// ─── Keywords Router ──────────────────────────────────────────────────────────

const keywordsRouter = router({
  list: protectedProcedure
    .input(z.object({ isBase: z.boolean().optional() }).optional())
    .query(({ input }) => listKeywords(input?.isBase)),
});

// ─── Content Gaps Router ──────────────────────────────────────────────────────

const contentGapsRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).optional() }).optional())
    .query(({ input }) => listContentGaps(input?.limit ?? 50)),
});

// ─── Base Keywords Router ─────────────────────────────────────────────────────

const baseKeywordsRouter = router({
  list: protectedProcedure.query(() => listBaseKeywords()),

  save: protectedProcedure
    .input(z.object({ keywords: z.array(z.string()).max(40) }))
    .mutation(({ input }) => saveBaseKeywords(input.keywords)),
});

// ─── Agent Router ─────────────────────────────────────────────────────────────

const agentRouter = router({
  triggerRun: protectedProcedure.mutation(async () => {
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

  getLastRun: protectedProcedure.query(() => getLastAgentRun()),

  listRuns: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(30).optional() }).optional())
    .query(({ input }) => listAgentRuns(input?.limit ?? 10)),
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
});

export type AppRouter = typeof appRouter;
