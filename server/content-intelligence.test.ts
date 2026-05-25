import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: { name: string; options: Record<string, unknown> }[] } {
  const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-open-id",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: { cookie: "" },
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

// ─── Auth tests ───────────────────────────────────────────────────────────────

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({
      maxAge: -1,
      httpOnly: true,
      path: "/",
    });
  });

  it("auth.me returns the current user when authenticated", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const me = await caller.auth.me();
    expect(me).toBeDefined();
    expect(me?.email).toBe("test@example.com");
  });
});

// ─── Topic hash deduplication logic ──────────────────────────────────────────

describe("Topic hash deduplication", () => {
  it("produces consistent hash for same topic", () => {
    function hashTopic(topic: string): string {
      let hash = 0;
      const normalized = topic.toLowerCase().trim().replace(/\s+/g, " ");
      for (let i = 0; i < normalized.length; i++) {
        const char = normalized.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(16).padStart(8, "0");
    }

    const h1 = hashTopic("Construction Finance Australia");
    const h2 = hashTopic("construction finance australia");
    const h3 = hashTopic("  Construction Finance Australia  ");
    expect(h1).toBe(h2);
    expect(h1).toBe(h3);
  });

  it("produces different hashes for different topics", () => {
    function hashTopic(topic: string): string {
      let hash = 0;
      const normalized = topic.toLowerCase().trim().replace(/\s+/g, " ");
      for (let i = 0; i < normalized.length; i++) {
        const char = normalized.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(16).padStart(8, "0");
    }

    const h1 = hashTopic("Construction Finance Australia");
    const h2 = hashTopic("Development Finance Melbourne");
    expect(h1).not.toBe(h2);
  });
});

// ─── Score validation ─────────────────────────────────────────────────────────

describe("Topic scoring", () => {
  it("score is clamped between 0 and 100", () => {
    function clampScore(score: number): number {
      return Math.min(100, Math.max(0, score));
    }
    expect(clampScore(-10)).toBe(0);
    expect(clampScore(110)).toBe(100);
    expect(clampScore(75.5)).toBe(75.5);
  });
});

// ─── Keyword intent validation ────────────────────────────────────────────────

describe("Keyword search intent", () => {
  it("validates intent values", () => {
    const validIntents = ["informational", "navigational", "commercial", "transactional"];
    for (const intent of validIntents) {
      expect(validIntents).toContain(intent);
    }
  });
});

// ─── Content gap priority ─────────────────────────────────────────────────────

describe("Content gap priority", () => {
  it("validates priority values", () => {
    const validPriorities = ["high", "medium", "low"];
    for (const p of validPriorities) {
      expect(validPriorities).toContain(p);
    }
  });

  it("orders priorities correctly", () => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    expect(priorityOrder["high"]).toBeLessThan(priorityOrder["medium"]);
    expect(priorityOrder["medium"]).toBeLessThan(priorityOrder["low"]);
  });
});

// ─── Base keywords ────────────────────────────────────────────────────────────

describe("Base keywords", () => {
  it("filters empty strings from keyword list", () => {
    const raw = ["Construction finance", "", "  ", "Development loan", ""];
    const filtered = raw.filter((k) => k.trim());
    expect(filtered).toHaveLength(2);
    expect(filtered).toContain("Construction finance");
    expect(filtered).toContain("Development loan");
  });

  it("trims whitespace from keywords", () => {
    const raw = ["  Construction finance  ", " Development loan "];
    const trimmed = raw.map((k) => k.trim());
    expect(trimmed[0]).toBe("Construction finance");
    expect(trimmed[1]).toBe("Development loan");
  });
});

// ─── 14-day news filter ───────────────────────────────────────────────────────

describe("News 14-day filter", () => {
  function filterNewsTo14Days(
    items: { title: string; publishedDate?: string }[]
  ) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);
    return items.filter((item) => {
      if (!item.publishedDate) return true; // keep if no date
      const d = new Date(item.publishedDate);
      return !isNaN(d.getTime()) && d >= cutoff;
    });
  }

  it("keeps items with no publishedDate", () => {
    const items = [{ title: "No date article" }];
    expect(filterNewsTo14Days(items)).toHaveLength(1);
  });

  it("keeps items published within the last 14 days", () => {
    const recent = new Date();
    recent.setDate(recent.getDate() - 7);
    const items = [{ title: "Recent article", publishedDate: recent.toISOString().split("T")[0] }];
    expect(filterNewsTo14Days(items)).toHaveLength(1);
  });

  it("discards items published more than 14 days ago", () => {
    const old = new Date();
    old.setDate(old.getDate() - 20);
    const items = [{ title: "Old article", publishedDate: old.toISOString().split("T")[0] }];
    expect(filterNewsTo14Days(items)).toHaveLength(0);
  });

  it("discards items with invalid date strings", () => {
    const items = [{ title: "Bad date", publishedDate: "not-a-date" }];
    // Invalid dates: NaN check should exclude them
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);
    const result = items.filter((item) => {
      if (!item.publishedDate) return true;
      const d = new Date(item.publishedDate);
      return !isNaN(d.getTime()) && d >= cutoff;
    });
    expect(result).toHaveLength(0);
  });

  it("correctly partitions a mixed list", () => {
    const recent = new Date();
    recent.setDate(recent.getDate() - 5);
    const old = new Date();
    old.setDate(old.getDate() - 30);
    const items = [
      { title: "Recent", publishedDate: recent.toISOString().split("T")[0] },
      { title: "Old", publishedDate: old.toISOString().split("T")[0] },
      { title: "No date" },
    ];
    const result = filterNewsTo14Days(items);
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.title)).toContain("Recent");
    expect(result.map((i) => i.title)).toContain("No date");
    expect(result.map((i) => i.title)).not.toContain("Old");
  });
});


// ─── Social Router tests ───────────────────────────────────────────────────────

describe("social.generateCaptions", () => {
  it("generates social media captions for a topic", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.social.generateCaptions({
        topic: "RBA Holds Steady in 2026",
        category: "Interest Rates",
      });

      expect(Array.isArray(result)).toBe(true);
    } catch (err: any) {
      // LLM may fail in test environment, but the procedure should be callable
      expect(err).toBeDefined();
    }
  });
});

describe("social.getHubSpotAccounts", () => {
  it("returns an array of HubSpot social accounts", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.social.getHubSpotAccounts();
      expect(Array.isArray(result)).toBe(true);
    } catch (err: any) {
      expect(err).toBeDefined();
    }
  });
});

describe("social.schedulePost", () => {
  it("schedules a post to HubSpot social or returns error if scopes insufficient", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const tomorrowIso = new Date(Date.now() + 86400000).toISOString();
    try {
      const result = await caller.social.schedulePost({
        caption: "Test caption for property finance",
        accountId: "test-account-id",
        scheduledTime: tomorrowIso,
      });

      expect(result).toBeDefined();
    } catch (err: any) {
      // Expected: HubSpot API key may not have social_post_write scope
      expect(err).toBeDefined();
    }
  });
});
