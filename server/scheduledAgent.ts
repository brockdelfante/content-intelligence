/**
 * Heartbeat handler for the daily midnight agent run.
 * Registered at POST /api/scheduled/daily-agent
 */
import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { runDailyAgent } from "./agent/agentRunner";

export async function dailyAgentHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only endpoint" });
    }

    console.log(`[Heartbeat] Daily agent triggered by cron task: ${user.taskUid}`);

    const hubspotKey = process.env.HUBSPOT_API_KEY;
    const result = await runDailyAgent(hubspotKey);

    return res.json({
      ok: true,
      runDate: new Date().toISOString().split("T")[0],
      ...result,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[Heartbeat] Daily agent handler error:", errorMsg);
    return res.status(500).json({
      error: errorMsg,
      stack: error instanceof Error ? error.stack : undefined,
      context: { url: req.url, taskUid: "unknown" },
      timestamp: new Date().toISOString(),
    });
  }
}
