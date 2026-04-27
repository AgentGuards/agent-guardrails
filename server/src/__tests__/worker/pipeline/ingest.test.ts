import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeHeliusTxn } from "../../fixtures/helius-txn.js";
import { makePolicy, makeGuardedTxn } from "../../fixtures/prisma-rows.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPrisma = {
  policy: { findUnique: vi.fn() },
  guardedTxn: { findUnique: vi.fn(), create: vi.fn(), upsert: vi.fn() },
};
vi.mock("../../../db/client.js", () => ({ prisma: mockPrisma }));

const mockEmitter = { emitEvent: vi.fn() };
vi.mock("../../../sse/emitter.js", () => ({ sseEmitter: mockEmitter }));

vi.mock("../../../config/env.js", () => ({
  env: { GUARDRAILS_PROGRAM_ID: "TestProgramId11111111111111111111" },
}));

// ---------------------------------------------------------------------------
// Import under test (after mocks are registered)
// ---------------------------------------------------------------------------

const { ingest } = await import("../../../worker/pipeline/ingest.js");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  // Default: no duplicate found (duplicate check calls findUnique)
  mockPrisma.guardedTxn.findUnique.mockResolvedValue(null);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ingest", () => {
  // =========================================================================
  // Field extraction via ingest()
  // =========================================================================

  describe("field extraction via ingest()", () => {
    it("extracts policy pubkey from first account of guardrails instruction", async () => {
      const txn = makeHeliusTxn({
        instructions: [
          {
            programId: "TestProgramId11111111111111111111",
            accounts: ["MyPolicyPda1111111111111111111111", "Agent111"],
            data: "",
            innerInstructions: [],
          },
        ],
      });

      const policy = makePolicy({ pubkey: "MyPolicyPda1111111111111111111111" });
      mockPrisma.policy.findUnique.mockResolvedValue(policy);

      const row = makeGuardedTxn({ policyPubkey: "MyPolicyPda1111111111111111111111" });
      mockPrisma.guardedTxn.create.mockResolvedValue(row);

      await ingest(txn, "MyPolicyPda1111111111111111111111");

      expect(mockPrisma.policy.findUnique).toHaveBeenCalledWith({
        where: { pubkey: "MyPolicyPda1111111111111111111111" },
      });
    });

    it("extracts target program from CPI inner instructions", async () => {
      const txn = makeHeliusTxn({
        instructions: [
          {
            programId: "TestProgramId11111111111111111111",
            accounts: ["PolicyPda1111111111111111111111111"],
            data: "",
            innerInstructions: [
              {
                programId: "InnerTarget11111111111111111111111",
                accounts: [],
                data: "",
              },
            ],
          },
        ],
      });

      const policy = makePolicy();
      mockPrisma.policy.findUnique.mockResolvedValue(policy);

      const row = makeGuardedTxn({ targetProgram: "InnerTarget11111111111111111111111" });
      mockPrisma.guardedTxn.create.mockResolvedValue(row);

      await ingest(txn, "MyPolicyPda1111111111111111111111");

      // The create call in upsert should use InnerTarget as targetProgram
      const upsertCall = mockPrisma.guardedTxn.create.mock.calls[0][0];
      expect(upsertCall.data.targetProgram).toBe("InnerTarget11111111111111111111111");
    });

    it("falls back to txn.type when no inner instructions exist", async () => {
      const txn = makeHeliusTxn({
        type: "TOKEN_MINT",
        instructions: [
          {
            programId: "TestProgramId11111111111111111111",
            accounts: ["PolicyPda1111111111111111111111111"],
            data: "",
            innerInstructions: [],
          },
        ],
      });

      const policy = makePolicy();
      mockPrisma.policy.findUnique.mockResolvedValue(policy);

      const row = makeGuardedTxn({ targetProgram: "TOKEN_MINT" });
      mockPrisma.guardedTxn.create.mockResolvedValue(row);

      await ingest(txn, "MyPolicyPda1111111111111111111111");

      const upsertCall = mockPrisma.guardedTxn.create.mock.calls[0][0];
      expect(upsertCall.data.targetProgram).toBe("TOKEN_MINT");
    });

    it("sums native transfers from fee payer as amountLamports", async () => {
      const txn = makeHeliusTxn({
        feePayer: "AgentPubkey11111111111111111111111",
        nativeTransfers: [
          { fromUserAccount: "AgentPubkey11111111111111111111111", toUserAccount: "Dest1", amount: 50_000_000 },
          { fromUserAccount: "AgentPubkey11111111111111111111111", toUserAccount: "Dest2", amount: 30_000_000 },
          { fromUserAccount: "SomeoneElse111111111111111111111", toUserAccount: "Dest3", amount: 999 },
        ],
      });

      const policy = makePolicy();
      mockPrisma.policy.findUnique.mockResolvedValue(policy);
      mockPrisma.guardedTxn.create.mockResolvedValue(makeGuardedTxn());

      await ingest(txn, "MyPolicyPda1111111111111111111111");

      const upsertCall = mockPrisma.guardedTxn.create.mock.calls[0][0];
      expect(upsertCall.data.amountLamports).toBe(BigInt(80_000_000));
    });

    it("returns null amountLamports when no native transfers", async () => {
      const txn = makeHeliusTxn({
        nativeTransfers: [],
      });

      const policy = makePolicy();
      mockPrisma.policy.findUnique.mockResolvedValue(policy);
      mockPrisma.guardedTxn.create.mockResolvedValue(makeGuardedTxn({ amountLamports: null }));

      await ingest(txn, "MyPolicyPda1111111111111111111111");

      const upsertCall = mockPrisma.guardedTxn.create.mock.calls[0][0];
      expect(upsertCall.data.amountLamports).toBeNull();
    });

    it("returns status=executed when no transactionError", async () => {
      const txn = makeHeliusTxn({ transactionError: null });

      const policy = makePolicy();
      mockPrisma.policy.findUnique.mockResolvedValue(policy);
      mockPrisma.guardedTxn.create.mockResolvedValue(makeGuardedTxn());

      await ingest(txn, "MyPolicyPda1111111111111111111111");

      const upsertCall = mockPrisma.guardedTxn.create.mock.calls[0][0];
      expect(upsertCall.data.status).toBe("executed");
      expect(upsertCall.data.rejectReason).toBeNull();
    });

    it("maps rejection reason codes to named reasons", async () => {
      const txn = makeHeliusTxn({
        transactionError: "SessionExpired",
      });

      const policy = makePolicy();
      mockPrisma.policy.findUnique.mockResolvedValue(policy);
      mockPrisma.guardedTxn.create.mockResolvedValue(makeGuardedTxn({ status: "rejected" }));

      await ingest(txn, "MyPolicyPda1111111111111111111111");

      const upsertCall = mockPrisma.guardedTxn.create.mock.calls[0][0];
      expect(upsertCall.data.status).toBe("rejected");
      expect(upsertCall.data.rejectReason).toBe("SessionExpired");
    });

    it("truncates unknown error strings to 256 chars", async () => {
      const longError = "x".repeat(500);
      const txn = makeHeliusTxn({ transactionError: longError });

      const policy = makePolicy();
      mockPrisma.policy.findUnique.mockResolvedValue(policy);
      mockPrisma.guardedTxn.create.mockResolvedValue(makeGuardedTxn({ status: "rejected" }));

      await ingest(txn, "MyPolicyPda1111111111111111111111");

      const upsertCall = mockPrisma.guardedTxn.create.mock.calls[0][0];
      expect(upsertCall.data.rejectReason).toHaveLength(256);
    });
  });

  // =========================================================================
  // ingest() database + SSE
  // =========================================================================

  describe("ingest() database + SSE", () => {
    it("returns null when policy not in database", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const txn = makeHeliusTxn();
      mockPrisma.policy.findUnique.mockResolvedValue(null);

      const result = await ingest(txn, "MyPolicyPda1111111111111111111111");

      expect(result).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("unknown policy"));

      warnSpy.mockRestore();
    });

    it("creates GuardedTxn with correct fields", async () => {
      const txn = makeHeliusTxn({ signature: "sig123abc" });

      const policy = makePolicy();
      mockPrisma.policy.findUnique.mockResolvedValue(policy);

      const row = makeGuardedTxn({ txnSig: "sig123abc" });
      mockPrisma.guardedTxn.create.mockResolvedValue(row);

      await ingest(txn, "MyPolicyPda1111111111111111111111");

      expect(mockPrisma.guardedTxn.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            txnSig: "sig123abc",
            policyPubkey: "MyPolicyPda1111111111111111111111",
            status: "executed",
          }),
        }),
      );
    });

    it("converts slot to BigInt and timestamp*1000 to Date", async () => {
      const txn = makeHeliusTxn({ slot: 999888, timestamp: 1700000000 });

      const policy = makePolicy();
      mockPrisma.policy.findUnique.mockResolvedValue(policy);
      mockPrisma.guardedTxn.create.mockResolvedValue(makeGuardedTxn());

      await ingest(txn, "MyPolicyPda1111111111111111111111");

      const upsertCall = mockPrisma.guardedTxn.create.mock.calls[0][0];
      expect(upsertCall.data.slot).toBe(BigInt(999888));
      expect(upsertCall.data.blockTime).toEqual(new Date(1700000000 * 1000));
    });

    it("returns null for duplicate txns (findUnique returns existing)", async () => {
      const txn = makeHeliusTxn({ signature: "dup-sig" });

      const policy = makePolicy();
      mockPrisma.policy.findUnique.mockResolvedValue(policy);

      const existingRow = makeGuardedTxn({ txnSig: "dup-sig" });
      // Duplicate check finds existing row
      mockPrisma.guardedTxn.findUnique.mockResolvedValue(existingRow);

      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const result = await ingest(txn, "MyPolicyPda1111111111111111111111");
      expect(result).toBeNull();
      // create should not have been called
      expect(mockPrisma.guardedTxn.create).not.toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it("emits new_transaction SSE with stringified bigints", async () => {
      const txn = makeHeliusTxn();

      const policy = makePolicy();
      mockPrisma.policy.findUnique.mockResolvedValue(policy);

      const row = makeGuardedTxn({
        slot: BigInt(555),
        amountLamports: BigInt(100_000_000),
      });
      mockPrisma.guardedTxn.create.mockResolvedValue(row);

      await ingest(txn, "MyPolicyPda1111111111111111111111");

      expect(mockEmitter.emitEvent).toHaveBeenCalledWith(
        "new_transaction",
        expect.objectContaining({
          slot: "555",
          amountLamports: "100000000",
        }),
      );
    });

    it("returns the created GuardedTxn row", async () => {
      const txn = makeHeliusTxn();

      const policy = makePolicy();
      mockPrisma.policy.findUnique.mockResolvedValue(policy);

      const row = makeGuardedTxn({ id: "row-id-42" });
      mockPrisma.guardedTxn.create.mockResolvedValue(row);

      const result = await ingest(txn, "MyPolicyPda1111111111111111111111");

      expect(result).toBe(row);
      expect(result!.id).toBe("row-id-42");
    });

    it("stores raw event as JSON", async () => {
      const txn = makeHeliusTxn({ signature: "raw-test" });

      const policy = makePolicy();
      mockPrisma.policy.findUnique.mockResolvedValue(policy);
      mockPrisma.guardedTxn.create.mockResolvedValue(makeGuardedTxn());

      await ingest(txn, "MyPolicyPda1111111111111111111111");

      const upsertCall = mockPrisma.guardedTxn.create.mock.calls[0][0];
      // rawEvent should be a serialized-then-parsed copy (JSON round-trip strips non-JSON values)
      expect(upsertCall.data.rawEvent).toBeDefined();
      expect(upsertCall.data.rawEvent.signature).toBe("raw-test");
    });

    it("handles null amountLamports correctly", async () => {
      const txn = makeHeliusTxn({ nativeTransfers: [] });

      const policy = makePolicy();
      mockPrisma.policy.findUnique.mockResolvedValue(policy);

      const row = makeGuardedTxn({ amountLamports: null });
      mockPrisma.guardedTxn.create.mockResolvedValue(row);

      await ingest(txn, "MyPolicyPda1111111111111111111111");

      // SSE event should have null for amountLamports
      expect(mockEmitter.emitEvent).toHaveBeenCalledWith(
        "new_transaction",
        expect.objectContaining({
          amountLamports: null,
        }),
      );
    });
  });

  // =========================================================================
  // Escalation detection (EscalatedToMultisig)
  // =========================================================================

  describe("escalation detection", () => {
    it("detects EscalatedToMultisig via Anchor custom error 6007", async () => {
      const txn = makeHeliusTxn({
        transactionError: JSON.parse('{"InstructionError":[0,{"Custom":6007}]}'),
      });

      const policy = makePolicy();
      mockPrisma.policy.findUnique.mockResolvedValue(policy);
      mockPrisma.guardedTxn.create.mockResolvedValue(makeGuardedTxn({ status: "escalated" }));

      await ingest(txn, "MyPolicyPda1111111111111111111111");

      const upsertCall = mockPrisma.guardedTxn.create.mock.calls[0][0];
      expect(upsertCall.data.status).toBe("escalated");
      expect(upsertCall.data.rejectReason).toBe("EscalatedToMultisig");
    });

    it("detects EscalatedToMultisig via error string name", async () => {
      const txn = makeHeliusTxn({
        transactionError: "EscalatedToMultisig",
      });

      const policy = makePolicy();
      mockPrisma.policy.findUnique.mockResolvedValue(policy);
      mockPrisma.guardedTxn.create.mockResolvedValue(makeGuardedTxn({ status: "escalated" }));

      await ingest(txn, "MyPolicyPda1111111111111111111111");

      const upsertCall = mockPrisma.guardedTxn.create.mock.calls[0][0];
      expect(upsertCall.data.status).toBe("escalated");
      expect(upsertCall.data.rejectReason).toBe("EscalatedToMultisig");
    });

    it("does not treat other custom errors as escalation", async () => {
      const txn = makeHeliusTxn({
        transactionError: JSON.parse('{"InstructionError":[0,{"Custom":6003}]}'),
      });

      const policy = makePolicy();
      mockPrisma.policy.findUnique.mockResolvedValue(policy);
      mockPrisma.guardedTxn.create.mockResolvedValue(makeGuardedTxn({ status: "rejected" }));

      await ingest(txn, "MyPolicyPda1111111111111111111111");

      const upsertCall = mockPrisma.guardedTxn.create.mock.calls[0][0];
      expect(upsertCall.data.status).toBe("rejected");
      expect(upsertCall.data.rejectReason).not.toBe("EscalatedToMultisig");
    });
  });
});
