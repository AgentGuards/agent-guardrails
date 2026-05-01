import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import { makePolicy, makeSpendTracker } from "../../fixtures/prisma-rows.js";

const mockPrisma = {
  policy: { findMany: vi.fn(), count: vi.fn() },
  incident: { count: vi.fn() },
  spendTracker: { findMany: vi.fn() },
};
vi.mock("../../../db/client.js", () => ({ prisma: mockPrisma }));

const { fleetRouter } = await import("../../../api/routes/fleet.js");
const { spendTrackersRouter } = await import("../../../api/routes/spend-trackers.js");

const WALLET = "OwnerPubkey11111111111111111111111";

function createTestApp(walletPubkey: string, router: express.Router, mountPath: string) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use((req, _res, next) => {
    (req as express.Request & { walletPubkey?: string }).walletPubkey = walletPubkey;
    next();
  });
  app.use(mountPath, router);
  return app;
}

describe("GET /api/fleet/summary", () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createTestApp(WALLET, fleetRouter, "/api/fleet");
  });

  it("returns zeros when wallet owns no policies", async () => {
    mockPrisma.policy.findMany.mockResolvedValue([]);

    const res = await request(app).get("/api/fleet/summary");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      activeAgents: 0,
      pausedAgents: 0,
      incidentsLast24h: 0,
      incidentsPrev24h: 0,
      totalLamportsSpent24h: "0",
      totalLamportsSpentPrev24h: null,
    });
    expect(mockPrisma.incident.count).not.toHaveBeenCalled();
  });

  it("aggregates counts and sums spend trackers", async () => {
    const p = makePolicy();
    mockPrisma.policy.findMany.mockResolvedValue([{ pubkey: p.pubkey }]);
    mockPrisma.policy.count.mockResolvedValueOnce(3); // active
    mockPrisma.policy.count.mockResolvedValueOnce(1); // paused
    mockPrisma.incident.count.mockResolvedValueOnce(5); // last24
    mockPrisma.incident.count.mockResolvedValueOnce(2); // prev24
    mockPrisma.spendTracker.findMany.mockResolvedValue([
      makeSpendTracker({ policyPubkey: p.pubkey, lamportsSpent24h: BigInt(1_000_000_000) }),
      makeSpendTracker({
        policyPubkey: "OtherPolicy22222222222222222222222",
        lamportsSpent24h: BigInt(500_000_000),
      }),
    ]);

    const res = await request(app).get("/api/fleet/summary");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      activeAgents: 3,
      pausedAgents: 1,
      incidentsLast24h: 5,
      incidentsPrev24h: 2,
      totalLamportsSpent24h: "1500000000",
      totalLamportsSpentPrev24h: null,
    });
  });
});

describe("GET /api/spend-trackers", () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createTestApp(WALLET, spendTrackersRouter, "/api/spend-trackers");
  });

  it("returns empty when wallet owns no policies", async () => {
    mockPrisma.policy.findMany.mockResolvedValue([]);

    const res = await request(app).get("/api/spend-trackers");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ spendTrackers: [] });
  });

  it("returns serialized trackers with policy snapshot", async () => {
    const p = makePolicy({ label: "Bot", dailyBudgetLamports: BigInt(10_000_000_000) });
    mockPrisma.policy.findMany.mockResolvedValue([{ pubkey: p.pubkey }]);
    const tracker = makeSpendTracker({
      policyPubkey: p.pubkey,
      lamportsSpent24h: BigInt(100),
      policy: {
        label: p.label,
        isActive: p.isActive,
        anomalyScore: p.anomalyScore,
        dailyBudgetLamports: p.dailyBudgetLamports,
      },
    });
    mockPrisma.spendTracker.findMany.mockResolvedValue([tracker]);

    const res = await request(app).get("/api/spend-trackers");
    expect(res.status).toBe(200);
    expect(res.body.spendTrackers).toHaveLength(1);
    expect(res.body.spendTrackers[0]).toMatchObject({
      policyPubkey: p.pubkey,
      lamportsSpent24h: "100",
      policy: {
        label: "Bot",
        isActive: true,
        dailyBudgetLamports: "10000000000",
      },
    });
  });
});
