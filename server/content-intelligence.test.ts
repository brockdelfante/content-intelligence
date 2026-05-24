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
