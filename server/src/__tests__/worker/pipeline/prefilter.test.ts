import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { makePolicy, makeGuardedTxn, makeAnomalyVerdict } from "../../fixtures/prisma-rows.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPrisma = {
  policy: { findUnique: vi.fn() },
  guardedTxn: { findMany: vi.fn() },
  anomalyVerdict: { create: vi.fn() },
};
vi.mock("../../../db/client.js", () => ({ prisma: mockPrisma }));

const mockEmitter = { emitEvent: vi.fn() };
vi.mock("../../../sse/emitter.js", () => ({ sseEmitter: mockEmitter }));

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------

const { prefilter } = await import("../../../worker/pipeline/prefilter.js");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  // Default: anomalyVerdict.create returns a valid verdict row (needed for skip path)
  mockPrisma.anomalyVerdict.create.mockResolvedValue(makeAnomalyVerdict());
});

afterEach(() => {
  vi.useRealTimers();
});

/** Create a history row with a specific createdAt relative to "now". */
function historyRow(secsAgo: number, overrides?: Record<string, unknown>) {
  const now = new Date();
  return makeGuardedTxn({
    createdAt: new Date(now.getTime() - secsAgo * 1000),
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("prefilter", () => {
  // =========================================================================
  // policy_inactive
  // =========================================================================

  describe("policy_inactive", () => {
    it("signals when policy isActive is false", async () => {
      vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

      const row = makeGuardedTxn();

      mockPrisma.policy.findUnique.mockResolvedValue(makePolicy({ isActive: false }));
      mockPrisma.guardedTxn.findMany.mockResolvedValue([historyRow(100)]);

      const result = await prefilter(row);

      expect(result.signals).toContain("policy_inactive");
      expect(result.skipped).toBe(false);
    });

    it("does not signal when policy isActive is true", async () => {
      vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

      const row = makeGuardedTxn();

      mockPrisma.policy.findUnique.mockResolvedValue(makePolicy({ isActive: true }));
      mockPrisma.guardedTxn.findMany.mockResolvedValue([historyRow(100)]);

      const result = await prefilter(row);

      expect(result.signals).not.toContain("policy_inactive");
    });
  });

  // =========================================================================
  // program_not_in_allowlist
  // =========================================================================

  describe("program_not_in_allowlist", () => {
    it("signals when target program is not in allowedPrograms", async () => {
      vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

      const row = makeGuardedTxn({ targetProgram: "RareProgram111111111111111111111111" });

      mockPrisma.policy.findUnique.mockResolvedValue(makePolicy());
      mockPrisma.guardedTxn.findMany.mockResolvedValue([historyRow(100)]);

      const result = await prefilter(row);

      expect(result.signals).toContain("program_not_in_allowlist");
      expect(result.skipped).toBe(false);
    });

    it("does not signal when target IS in allowedPrograms", async () => {
      vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

      // TargetProgram1111111111111111111111 is in the default fixture allow-list
      const row = makeGuardedTxn({ targetProgram: "TargetProgram1111111111111111111111" });

      mockPrisma.policy.findUnique.mockResolvedValue(makePolicy());
      mockPrisma.guardedTxn.findMany.mockResolvedValue([historyRow(100)]);

      const result = await prefilter(row);

      expect(result.signals).not.toContain("program_not_in_allowlist");
    });

    it("does not signal when allowedPrograms is empty (unrestricted)", async () => {
      vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

      const row = makeGuardedTxn({ targetProgram: "AnyProgram111111111111111111111111" });

      mockPrisma.policy.findUnique.mockResolvedValue(makePolicy({ allowedPrograms: [] }));
      mockPrisma.guardedTxn.findMany.mockResolvedValue([historyRow(100)]);

      const result = await prefilter(row);

      expect(result.signals).not.toContain("program_not_in_allowlist");
    });
  });

  // =========================================================================
  // cold_start
  // =========================================================================

  describe("cold_start", () => {
    it("signals when there is no transaction history", async () => {
      vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

      const row = makeGuardedTxn();

      mockPrisma.policy.findUnique.mockResolvedValue(makePolicy());
      mockPrisma.guardedTxn.findMany.mockResolvedValue([]);

      const result = await prefilter(row);

      expect(result.signals).toContain("cold_start");
    });

    it("does not signal when history exists", async () => {
      vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

      const row = makeGuardedTxn();

      mockPrisma.policy.findUnique.mockResolvedValue(makePolicy());
      mockPrisma.guardedTxn.findMany.mockResolvedValue([historyRow(100)]);

      const result = await prefilter(row);

      expect(result.signals).not.toContain("cold_start");
    });
  });

  // =========================================================================
  // burst_detected / elevated_frequency
  // =========================================================================

  describe("burst_detected / elevated_frequency", () => {
    it("signals burst_detected when >= 10 txns in last 60s", async () => {
      vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

      const row = makeGuardedTxn();

      // 10 txns within the last 60 seconds
      mockPrisma.guardedTxn.findMany.mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => historyRow(5 + i * 5)),
      );

      mockPrisma.policy.findUnique.mockResolvedValue(makePolicy());

      const result = await prefilter(row);

      expect(result.signals).toContain("burst_detected");
    });

    it("signals elevated_frequency when 3-9 txns in last 60s", async () => {
      vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

      const row = makeGuardedTxn();

      // 3 txns within 60s, rest older
      mockPrisma.guardedTxn.findMany.mockResolvedValue([
        historyRow(10),
        historyRow(20),
        historyRow(30),
        historyRow(300), // older than 60s
      ]);

      mockPrisma.policy.findUnique.mockResolvedValue(makePolicy());

      const result = await prefilter(row);

      expect(result.signals).toContain("elevated_frequency");
      expect(result.signals).not.toContain("burst_detected");
    });

    it("does not signal with 2 txns in 60s", async () => {
      vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

      const row = makeGuardedTxn();

      mockPrisma.guardedTxn.findMany.mockResolvedValue([
        historyRow(10),
        historyRow(20),
        historyRow(300),
      ]);

      mockPrisma.policy.findUnique.mockResolvedValue(makePolicy());

      const result = await prefilter(row);

      expect(result.signals).not.toContain("burst_detected");
      expect(result.signals).not.toContain("elevated_frequency");
    });
  });

  // =========================================================================
  // high_amount
  // =========================================================================

  describe("high_amount / amount_exceeds_cap", () => {
    it("signals high_amount when amount > 80% of maxTxLamports", async () => {
      vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

      // 85% of 1 SOL = 850_000_000
      const row = makeGuardedTxn({ amountLamports: BigInt(850_000_000) });

      mockPrisma.guardedTxn.findMany.mockResolvedValue([]);
      mockPrisma.policy.findUnique.mockResolvedValue(
        makePolicy({ maxTxLamports: BigInt(1_000_000_000) }),
      );

      const result = await prefilter(row);

      expect(result.signals).toContain("high_amount");
      expect(result.signals).not.toContain("amount_exceeds_cap");
    });

    it("signals amount_exceeds_cap when amount > 100% of maxTxLamports", async () => {
      vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

      // 120% of 1 SOL = 1_200_000_000
      const row = makeGuardedTxn({ amountLamports: BigInt(1_200_000_000) });

      mockPrisma.guardedTxn.findMany.mockResolvedValue([]);
      mockPrisma.policy.findUnique.mockResolvedValue(
        makePolicy({ maxTxLamports: BigInt(1_000_000_000) }),
      );

      const result = await prefilter(row);

      expect(result.signals).toContain("amount_exceeds_cap");
      expect(result.signals).not.toContain("high_amount");
    });

    it("does not signal at exactly 80%", async () => {
      vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

      // Exactly 80% of 1 SOL = 800_000_000
      const row = makeGuardedTxn({ amountLamports: BigInt(800_000_000) });

      mockPrisma.guardedTxn.findMany.mockResolvedValue([]);
      mockPrisma.policy.findUnique.mockResolvedValue(
        makePolicy({ maxTxLamports: BigInt(1_000_000_000) }),
      );

      const result = await prefilter(row);

      expect(result.signals).not.toContain("high_amount");
      expect(result.signals).not.toContain("amount_exceeds_cap");
    });

    it("does not signal when maxTxLamports is 0", async () => {
      vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

      const row = makeGuardedTxn({ amountLamports: BigInt(999_999_999) });

      mockPrisma.guardedTxn.findMany.mockResolvedValue([]);
      mockPrisma.policy.findUnique.mockResolvedValue(
        makePolicy({ maxTxLamports: BigInt(0) }),
      );

      const result = await prefilter(row);

      expect(result.signals).not.toContain("high_amount");
    });

    it("does not signal when amountLamports is null", async () => {
      vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

      const row = makeGuardedTxn({ amountLamports: null });

      mockPrisma.guardedTxn.findMany.mockResolvedValue([]);
      mockPrisma.policy.findUnique.mockResolvedValue(
        makePolicy({ maxTxLamports: BigInt(1_000_000_000) }),
      );

      const result = await prefilter(row);

      expect(result.signals).not.toContain("high_amount");
    });
  });

  // =========================================================================
  // budget_nearly_exhausted
  // =========================================================================

  describe("budget_nearly_exhausted / budget_exceeded", () => {
    it("signals budget_nearly_exhausted when daily spend > 80% of budget", async () => {
      vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

      const row = makeGuardedTxn();

      // Today's transactions sum to > 80% of 10 SOL budget = > 8 SOL
      const startOfToday = new Date("2025-06-15T00:00:00Z");
      mockPrisma.guardedTxn.findMany.mockResolvedValue([
        makeGuardedTxn({
          amountLamports: BigInt(5_000_000_000),
          createdAt: new Date(startOfToday.getTime() + 3600_000),
        }),
        makeGuardedTxn({
          amountLamports: BigInt(4_000_000_000),
          createdAt: new Date(startOfToday.getTime() + 7200_000),
        }),
      ]);

      mockPrisma.policy.findUnique.mockResolvedValue(
        makePolicy({ dailyBudgetLamports: BigInt(10_000_000_000) }),
      );

      const result = await prefilter(row);

      expect(result.signals).toContain("budget_nearly_exhausted");
      expect(result.signals).not.toContain("budget_exceeded");
    });

    it("signals budget_exceeded when daily spend > 100% of budget", async () => {
      vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

      const row = makeGuardedTxn();

      const startOfToday = new Date("2025-06-15T00:00:00Z");
      mockPrisma.guardedTxn.findMany.mockResolvedValue([
        makeGuardedTxn({
          amountLamports: BigInt(6_000_000_000),
          createdAt: new Date(startOfToday.getTime() + 3600_000),
        }),
        makeGuardedTxn({
          amountLamports: BigInt(6_000_000_000),
          createdAt: new Date(startOfToday.getTime() + 7200_000),
        }),
      ]);

      mockPrisma.policy.findUnique.mockResolvedValue(
        makePolicy({ dailyBudgetLamports: BigInt(10_000_000_000) }),
      );

      const result = await prefilter(row);

      expect(result.signals).toContain("budget_exceeded");
      expect(result.signals).not.toContain("budget_nearly_exhausted");
    });

    it("does not signal at exactly 80%", async () => {
      vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

      const row = makeGuardedTxn();

      const startOfToday = new Date("2025-06-15T00:00:00Z");
      mockPrisma.guardedTxn.findMany.mockResolvedValue([
        makeGuardedTxn({
          amountLamports: BigInt(8_000_000_000), // exactly 80%
          createdAt: new Date(startOfToday.getTime() + 3600_000),
        }),
      ]);

      mockPrisma.policy.findUnique.mockResolvedValue(
        makePolicy({ dailyBudgetLamports: BigInt(10_000_000_000) }),
      );

      const result = await prefilter(row);

      expect(result.signals).not.toContain("budget_nearly_exhausted");
      expect(result.signals).not.toContain("budget_exceeded");
    });

    it("does not signal when dailyBudgetLamports is 0", async () => {
      vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

      const row = makeGuardedTxn();

      const startOfToday = new Date("2025-06-15T00:00:00Z");
      mockPrisma.guardedTxn.findMany.mockResolvedValue([
        makeGuardedTxn({
          amountLamports: BigInt(999_999),
          createdAt: new Date(startOfToday.getTime() + 3600_000),
        }),
      ]);

      mockPrisma.policy.findUnique.mockResolvedValue(
        makePolicy({ dailyBudgetLamports: BigInt(0) }),
      );

      const result = await prefilter(row);

      expect(result.signals).not.toContain("budget_nearly_exhausted");
    });

    it("only counts today's transactions (UTC)", async () => {
      vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

      const row = makeGuardedTxn();

      // Yesterday's big txn should NOT count
      mockPrisma.guardedTxn.findMany.mockResolvedValue([
        makeGuardedTxn({
          amountLamports: BigInt(9_000_000_000),
          createdAt: new Date("2025-06-14T23:59:59Z"), // yesterday
        }),
        makeGuardedTxn({
          amountLamports: BigInt(1_000_000_000), // only 10% today
          createdAt: new Date("2025-06-15T01:00:00Z"),
        }),
      ]);

      mockPrisma.policy.findUnique.mockResolvedValue(
        makePolicy({ dailyBudgetLamports: BigInt(10_000_000_000) }),
      );

      const result = await prefilter(row);

      expect(result.signals).not.toContain("budget_nearly_exhausted");
    });
  });

  // =========================================================================
  // session_expiring_soon
  // =========================================================================

  describe("session_expiring_soon", () => {
    it("signals when session expires in < 10 minutes", async () => {
      const now = new Date("2025-06-15T12:00:00Z");
      vi.setSystemTime(now);

      const row = makeGuardedTxn();
      mockPrisma.guardedTxn.findMany.mockResolvedValue([]);

      // Session expires 5 minutes from now
      mockPrisma.policy.findUnique.mockResolvedValue(
        makePolicy({
          sessionExpiry: new Date(now.getTime() + 5 * 60_000),
        }),
      );

      const result = await prefilter(row);

      expect(result.signals).toContain("session_expiring_soon");
    });

    it("does not signal at exactly 10 minutes", async () => {
      const now = new Date("2025-06-15T12:00:00Z");
      vi.setSystemTime(now);

      const row = makeGuardedTxn();
      mockPrisma.guardedTxn.findMany.mockResolvedValue([]);

      // Session expires exactly 10 minutes from now
      mockPrisma.policy.findUnique.mockResolvedValue(
        makePolicy({
          sessionExpiry: new Date(now.getTime() + 10 * 60_000),
        }),
      );

      const result = await prefilter(row);

      expect(result.signals).not.toContain("session_expiring_soon");
    });

    it("signals when session is already expired", async () => {
      const now = new Date("2025-06-15T12:00:00Z");
      vi.setSystemTime(now);

      const row = makeGuardedTxn();
      mockPrisma.guardedTxn.findMany.mockResolvedValue([]);

      // Session expired 30 minutes ago
      mockPrisma.policy.findUnique.mockResolvedValue(
        makePolicy({
          sessionExpiry: new Date(now.getTime() - 30 * 60_000),
        }),
      );

      const result = await prefilter(row);

      expect(result.signals).toContain("session_expiring_soon");
    });
  });

  // =========================================================================
  // outside_active_hours
  // =========================================================================

  describe("outside_active_hours", () => {
    it("signals when current hour > 3h from median", async () => {
      // Set current time to 18:00 UTC
      vi.setSystemTime(new Date("2025-06-15T18:00:00Z"));

      const row = makeGuardedTxn();

      // All history at hour 10 UTC => median is 10, current is 18, diff=8
      mockPrisma.guardedTxn.findMany.mockResolvedValue([
        makeGuardedTxn({ createdAt: new Date("2025-06-15T10:00:00Z") }),
        makeGuardedTxn({ createdAt: new Date("2025-06-14T10:00:00Z") }),
        makeGuardedTxn({ createdAt: new Date("2025-06-13T10:00:00Z") }),
      ]);

      mockPrisma.policy.findUnique.mockResolvedValue(makePolicy());

      const result = await prefilter(row);

      expect(result.signals).toContain("outside_active_hours");
    });

    it("handles hour wrap: median=23, current=2 is 3h (no signal)", async () => {
      // Current hour = 2 UTC
      vi.setSystemTime(new Date("2025-06-15T02:00:00Z"));

      const row = makeGuardedTxn();

      // All history at hour 23 UTC => median is 23, current is 2
      // Wrap diff = min(|2-23|, 24-|2-23|) = min(21, 3) = 3 => NOT > 3
      mockPrisma.guardedTxn.findMany.mockResolvedValue([
        makeGuardedTxn({ createdAt: new Date("2025-06-14T23:00:00Z") }),
        makeGuardedTxn({ createdAt: new Date("2025-06-13T23:00:00Z") }),
        makeGuardedTxn({ createdAt: new Date("2025-06-12T23:00:00Z") }),
      ]);

      mockPrisma.policy.findUnique.mockResolvedValue(makePolicy());

      const result = await prefilter(row);

      expect(result.signals).not.toContain("outside_active_hours");
    });

    it("handles hour wrap: median=23, current=3 is 4h (signals)", async () => {
      // Current hour = 3 UTC
      vi.setSystemTime(new Date("2025-06-15T03:00:00Z"));

      const row = makeGuardedTxn();

      // All history at hour 23 UTC => median is 23, current is 3
      // Wrap diff = min(|3-23|, 24-|3-23|) = min(20, 4) = 4 => > 3 signals
      mockPrisma.guardedTxn.findMany.mockResolvedValue([
        makeGuardedTxn({ createdAt: new Date("2025-06-14T23:00:00Z") }),
        makeGuardedTxn({ createdAt: new Date("2025-06-13T23:00:00Z") }),
        makeGuardedTxn({ createdAt: new Date("2025-06-12T23:00:00Z") }),
      ]);

      mockPrisma.policy.findUnique.mockResolvedValue(makePolicy());

      const result = await prefilter(row);

      expect(result.signals).toContain("outside_active_hours");
    });

    it("does not signal when no history", async () => {
      vi.setSystemTime(new Date("2025-06-15T18:00:00Z"));

      const row = makeGuardedTxn();

      mockPrisma.guardedTxn.findMany.mockResolvedValue([]);
      mockPrisma.policy.findUnique.mockResolvedValue(makePolicy());

      const result = await prefilter(row);

      expect(result.signals).not.toContain("outside_active_hours");
    });
  });

  // =========================================================================
  // anomaly_score_elevated
  // =========================================================================

  describe("anomaly_score_elevated", () => {
    it("signals when anomalyScore >= escalationThreshold", async () => {
      vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

      const row = makeGuardedTxn();

      mockPrisma.policy.findUnique.mockResolvedValue(
        makePolicy({ anomalyScore: 80, escalationThreshold: BigInt(75) }),
      );
      mockPrisma.guardedTxn.findMany.mockResolvedValue([historyRow(100)]);

      const result = await prefilter(row);

      expect(result.signals).toContain("anomaly_score_elevated");
    });

    it("does not signal when anomalyScore < escalationThreshold", async () => {
      vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

      const row = makeGuardedTxn();

      mockPrisma.policy.findUnique.mockResolvedValue(
        makePolicy({ anomalyScore: 30, escalationThreshold: BigInt(75) }),
      );
      mockPrisma.guardedTxn.findMany.mockResolvedValue([historyRow(100)]);

      const result = await prefilter(row);

      expect(result.signals).not.toContain("anomaly_score_elevated");
    });

    it("does not signal when escalationThreshold is null", async () => {
      vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

      const row = makeGuardedTxn();

      mockPrisma.policy.findUnique.mockResolvedValue(
        makePolicy({ anomalyScore: 99, escalationThreshold: null }),
      );
      mockPrisma.guardedTxn.findMany.mockResolvedValue([historyRow(100)]);

      const result = await prefilter(row);

      expect(result.signals).not.toContain("anomaly_score_elevated");
    });
  });

  // =========================================================================
  // prefilter() integration
  // =========================================================================

  describe("prefilter()", () => {
    it("returns { signals: [], skipped: true } and creates allow verdict when no signals", async () => {
      const now = new Date("2025-06-15T12:00:00Z");
      vi.setSystemTime(now);

      // Use a program that IS in the default allow-list
      const row = makeGuardedTxn({
        targetProgram: "TargetProgram1111111111111111111111",
        amountLamports: BigInt(100_000_000), // 10% of 1 SOL cap
      });

      // History exists (avoid cold_start), within active hours
      mockPrisma.guardedTxn.findMany.mockResolvedValue([
        makeGuardedTxn({
          targetProgram: "TargetProgram1111111111111111111111",
          createdAt: new Date("2025-06-15T11:00:00Z"),
        }),
      ]);

      mockPrisma.policy.findUnique.mockResolvedValue(
        makePolicy({
          maxTxLamports: BigInt(1_000_000_000),
          dailyBudgetLamports: BigInt(10_000_000_000),
          sessionExpiry: new Date(now.getTime() + 60 * 60_000), // 1 hour from now
        }),
      );

      const verdictRow = makeAnomalyVerdict({ verdict: "allow", model: "prefilter" });
      mockPrisma.anomalyVerdict.create.mockResolvedValue(verdictRow);

      const result = await prefilter(row);

      expect(result.signals).toEqual([]);
      expect(result.skipped).toBe(true);
      expect(mockPrisma.anomalyVerdict.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            verdict: "allow",
            model: "prefilter",
            prefilterSkipped: true,
            confidence: 90,
          }),
        }),
      );
      expect(mockEmitter.emitEvent).toHaveBeenCalledWith("verdict", expect.anything());
    });

    it("returns { signals, skipped: false } when signals are present", async () => {
      const now = new Date("2025-06-15T12:00:00Z");
      vi.setSystemTime(now);

      // Amount is 85% of cap => high_amount (threshold is now 80%)
      const row = makeGuardedTxn({
        amountLamports: BigInt(850_000_000),
      });

      mockPrisma.guardedTxn.findMany.mockResolvedValue([historyRow(100)]);
      mockPrisma.policy.findUnique.mockResolvedValue(
        makePolicy({
          maxTxLamports: BigInt(1_000_000_000),
          dailyBudgetLamports: BigInt(10_000_000_000),
          sessionExpiry: new Date(now.getTime() + 60 * 60_000),
        }),
      );

      const result = await prefilter(row);

      expect(result.signals.length).toBeGreaterThan(0);
      expect(result.signals).toContain("high_amount");
      expect(result.skipped).toBe(false);
      // Should NOT create a verdict row when signals are present
      expect(mockPrisma.anomalyVerdict.create).not.toHaveBeenCalled();
      expect(mockEmitter.emitEvent).not.toHaveBeenCalled();
    });
  });
});
