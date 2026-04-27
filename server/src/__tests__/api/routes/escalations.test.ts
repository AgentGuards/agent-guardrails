import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import {
  makePolicy,
  makeGuardedTxn,
  makeSpendTracker,
} from "../../fixtures/prisma-rows.js";

const mockPrisma = {
  policy: { findUnique: vi.fn(), findMany: vi.fn() },
  escalationProposal: { findMany: vi.fn(), findFirst: vi.fn(), count: vi.fn(), update: vi.fn() },
};
vi.mock("../../../db/client.js", () => ({ prisma: mockPrisma }));

vi.mock("../../../config/env.js", () => ({
  env: { GUARDRAILS_PROGRAM_ID: "TestProgramId11111111111111111111" },
}));

const mockReconstructInstruction = vi.fn();
vi.mock("../../../worker/pipeline/reconstruct-instruction.js", () => ({
  reconstructInstruction: mockReconstructInstruction,
}));

const mockEmitter = { emitEvent: vi.fn() };
vi.mock("../../../sse/emitter.js", () => ({ sseEmitter: mockEmitter }));

const { escalationsRouter } = await import("../../../api/routes/escalations.js");

const WALLET = "OwnerPubkey11111111111111111111111";

function createTestApp(walletPubkey: string, router: express.Router, path: string) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use((req, _res, next) => {
    (req as any).walletPubkey = walletPubkey;
    next();
  });
  app.use(path, router);
  return app;
}

function makeEscalation(overrides?: Record<string, unknown>) {
  return {
    id: "esc-001",
    policyPubkey: "PolicyPda1111111111111111111111111",
    txnId: "txn-001",
    squadsMultisig: "MultisigPda11111111111111111111111",
    targetProgram: "TargetProgram1111111111111111111111",
    amountLamports: BigInt(5_000_000_000),
    proposalPda: null,
    transactionIndex: null,
    status: "awaiting_proposal",
    approvals: [],
    rejections: [],
    executedTxnSig: null,
    expiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("GET /api/escalations", () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createTestApp(WALLET, escalationsRouter, "/api/escalations");
  });

  it("returns empty when wallet owns no policies", async () => {
    mockPrisma.policy.findMany.mockResolvedValue([]);

    const res = await request(app).get("/api/escalations");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ escalations: [], total: 0 });
  });

  it("returns escalations for owned policies", async () => {
    const policy = makePolicy();
    const escalation = makeEscalation();
    mockPrisma.policy.findMany.mockResolvedValue([{ pubkey: policy.pubkey }]);
    mockPrisma.escalationProposal.findMany.mockResolvedValue([escalation]);
    mockPrisma.escalationProposal.count.mockResolvedValue(1);

    const res = await request(app).get("/api/escalations");
    expect(res.status).toBe(200);
    expect(res.body.escalations).toHaveLength(1);
    expect(res.body.total).toBe(1);
    expect(res.body.escalations[0].amountLamports).toBe("5000000000");
  });

  it("filters by policy query param", async () => {
    const policy = makePolicy();
    mockPrisma.policy.findMany.mockResolvedValue([{ pubkey: policy.pubkey }]);
    mockPrisma.escalationProposal.findMany.mockResolvedValue([]);
    mockPrisma.escalationProposal.count.mockResolvedValue(0);

    await request(app).get(`/api/escalations?policy=${policy.pubkey}`);
    expect(mockPrisma.escalationProposal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { policyPubkey: policy.pubkey },
      }),
    );
  });
});

describe("GET /api/escalations/:id", () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createTestApp(WALLET, escalationsRouter, "/api/escalations");
  });

  it("returns 404 when not found", async () => {
    mockPrisma.escalationProposal.findFirst.mockResolvedValue(null);

    const res = await request(app).get("/api/escalations/nonexistent-id");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Escalation not found" });
  });

  it("returns escalation with txn data when found", async () => {
    const txn = makeGuardedTxn({ id: "txn-001" });
    const escalation = makeEscalation({ txn });
    mockPrisma.escalationProposal.findFirst.mockResolvedValue(escalation);
    mockReconstructInstruction.mockReturnValue({
      programId: "11111111111111111111111111111111",
      data: "AQAAAA==",
      accounts: [],
      amountLamports: "5000000000",
    });

    const res = await request(app).get("/api/escalations/esc-001");
    expect(res.status).toBe(200);
    expect(res.body.id).toBe("esc-001");
    expect(res.body.instruction).toBeDefined();
    expect(res.body.instruction.programId).toBe("11111111111111111111111111111111");
    expect(mockPrisma.escalationProposal.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ include: { txn: true } }),
    );
  });
});

describe("PATCH /api/escalations/:id", () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createTestApp(WALLET, escalationsRouter, "/api/escalations");
  });

  it("returns 404 when not found", async () => {
    mockPrisma.escalationProposal.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .patch("/api/escalations/nonexistent-id")
      .send({ proposalPda: "ProposalPda111111111111111111111111", transactionIndex: 0 });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Escalation not found" });
  });

  it("returns 400 when missing proposalPda or transactionIndex", async () => {
    const res = await request(app)
      .patch("/api/escalations/esc-001")
      .send({});
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "proposalPda and transactionIndex are required" });
  });

  it("returns 409 when status is not awaiting_proposal", async () => {
    const escalation = makeEscalation({ status: "pending" });
    mockPrisma.escalationProposal.findFirst.mockResolvedValue(escalation);

    const res = await request(app)
      .patch("/api/escalations/esc-001")
      .send({ proposalPda: "ProposalPda111111111111111111111111", transactionIndex: 0 });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'Cannot update \u2014 status is "pending"' });
  });

  it("updates proposal PDA and status to pending on success", async () => {
    const escalation = makeEscalation();
    mockPrisma.escalationProposal.findFirst.mockResolvedValue(escalation);

    const updated = makeEscalation({
      proposalPda: "ProposalPda111111111111111111111111",
      transactionIndex: BigInt(0),
      status: "pending",
    });
    mockPrisma.escalationProposal.update.mockResolvedValue(updated);

    const res = await request(app)
      .patch("/api/escalations/esc-001")
      .send({ proposalPda: "ProposalPda111111111111111111111111", transactionIndex: 0 });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("pending");
    expect(res.body.proposalPda).toBe("ProposalPda111111111111111111111111");
    expect(res.body.transactionIndex).toBe("0");
    expect(mockPrisma.escalationProposal.update).toHaveBeenCalledWith({
      where: { id: "esc-001" },
      data: {
        proposalPda: "ProposalPda111111111111111111111111",
        transactionIndex: BigInt(0),
        status: "pending",
      },
    });
    expect(mockEmitter.emitEvent).toHaveBeenCalledWith(
      "escalation_updated",
      expect.objectContaining({
        id: updated.id,
        status: "pending",
      }),
    );
  });
});
