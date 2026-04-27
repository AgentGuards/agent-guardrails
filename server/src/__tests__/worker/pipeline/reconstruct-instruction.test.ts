import { describe, it, expect, vi } from "vitest";
import { makeGuardedTxn } from "../../fixtures/prisma-rows.js";

vi.mock("../../../config/env.js", () => ({
  env: { GUARDRAILS_PROGRAM_ID: "TestProgramId11111111111111111111" },
}));

const { reconstructInstruction } = await import(
  "../../../worker/pipeline/reconstruct-instruction.js"
);

describe("reconstructInstruction", () => {
  it("returns null when rawEvent is null", () => {
    const row = makeGuardedTxn({ rawEvent: null });
    expect(reconstructInstruction(row)).toBeNull();
  });

  it("returns null when rawEvent has no instructions", () => {
    const row = makeGuardedTxn({ rawEvent: { foo: "bar" } });
    expect(reconstructInstruction(row)).toBeNull();
  });

  it("returns null when no guardrails instruction found", () => {
    const row = makeGuardedTxn({
      rawEvent: {
        instructions: [
          {
            programId: "SomeOtherProgram1111111111111111",
            accounts: ["a", "b", "c", "d", "e"],
            data: Buffer.alloc(20).toString("base64"),
          },
        ],
      },
    });
    expect(reconstructInstruction(row)).toBeNull();
  });

  it("returns null when instruction has too few accounts", () => {
    const row = makeGuardedTxn({
      rawEvent: {
        instructions: [
          {
            programId: "TestProgramId11111111111111111111",
            accounts: ["a", "b"], // need at least 5
            data: Buffer.alloc(20).toString("base64"),
          },
        ],
      },
    });
    expect(reconstructInstruction(row)).toBeNull();
  });

  it("extracts target program from accounts[3]", () => {
    // Build a valid guarded_execute instruction data:
    // 8 bytes discriminator + 4 bytes data length + data bytes + 8 bytes amount_hint
    const innerData = Buffer.from([0x02, 0x00, 0x00, 0x00, 0x40, 0x42, 0x0f, 0x00, 0x00, 0x00, 0x00, 0x00]);
    const buf = Buffer.alloc(8 + 4 + innerData.length + 8);
    // Discriminator (8 bytes of zeros — doesn't matter for our parser)
    buf.writeUInt32LE(innerData.length, 8); // Vec<u8> length prefix
    innerData.copy(buf, 12);
    // amount_hint = 1_000_000 (8 bytes LE)
    buf.writeBigUInt64LE(1_000_000n, 12 + innerData.length);

    const row = makeGuardedTxn({
      rawEvent: {
        instructions: [
          {
            programId: "TestProgramId11111111111111111111",
            accounts: [
              "Agent111111111111111111111111111111",  // [0] agent
              "Policy11111111111111111111111111111",  // [1] policy
              "Tracker1111111111111111111111111111",  // [2] tracker
              "TargetProg111111111111111111111111",   // [3] target program
              "11111111111111111111111111111111",      // [4] system program
              "CpiAccount1111111111111111111111111",  // [5] remaining account 1
              "CpiAccount2222222222222222222222222",  // [6] remaining account 2
            ],
            data: buf.toString("base64"),
          },
        ],
      },
    });

    const result = reconstructInstruction(row);
    expect(result).not.toBeNull();
    expect(result!.programId).toBe("TargetProg111111111111111111111111");
    expect(result!.amountLamports).toBe("1000000");
  });

  it("builds accounts from remaining_accounts excluding target program", () => {
    const innerData = Buffer.from([0x01, 0x02, 0x03]);
    const buf = Buffer.alloc(8 + 4 + innerData.length + 8);
    buf.writeUInt32LE(innerData.length, 8);
    innerData.copy(buf, 12);
    buf.writeBigUInt64LE(0n, 12 + innerData.length);

    const row = makeGuardedTxn({
      rawEvent: {
        instructions: [
          {
            programId: "TestProgramId11111111111111111111",
            accounts: [
              "Agent111111111111111111111111111111",
              "Policy11111111111111111111111111111",
              "Tracker1111111111111111111111111111",
              "TargetProg111111111111111111111111",
              "11111111111111111111111111111111",
              "Policy11111111111111111111111111111",  // remaining: policy PDA (signer)
              "Dest11111111111111111111111111111111",  // remaining: destination
            ],
            data: buf.toString("base64"),
          },
        ],
      },
    });

    const result = reconstructInstruction(row);
    expect(result).not.toBeNull();
    // remaining_accounts = accounts[5..], minus target program if present
    expect(result!.accounts).toHaveLength(2);
    // Policy PDA should be marked as signer
    expect(result!.accounts[0].pubkey).toBe("Policy11111111111111111111111111111");
    expect(result!.accounts[0].isSigner).toBe(true);
    // Destination should not be signer
    expect(result!.accounts[1].pubkey).toBe("Dest11111111111111111111111111111111");
    expect(result!.accounts[1].isSigner).toBe(false);
  });
});
