import { PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import {
  parseAllowedProgramAddresses,
  truncatePauseReason,
  validatePauseReason,
  validateSessionDays,
  validateSolLimits,
} from "@/lib/policy/wizard-validation";
import { MAX_ALLOWED_PROGRAMS } from "@/lib/policy/constants";

describe("parseAllowedProgramAddresses", () => {
  it("rejects empty list", () => {
    const r = parseAllowedProgramAddresses([]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/at least one/i);
  });

  it("accepts valid unique addresses", () => {
    const a = Keypairish();
    const b = Keypairish();
    const r = parseAllowedProgramAddresses([a, b, a]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.programs).toHaveLength(2);
  });

  it("rejects invalid address", () => {
    const r = parseAllowedProgramAddresses(["not-a-pubkey"]);
    expect(r.ok).toBe(false);
  });

  it("rejects more than max programs", () => {
    const keys = Array.from({ length: MAX_ALLOWED_PROGRAMS + 1 }, () => Keypairish());
    const r = parseAllowedProgramAddresses(keys);
    expect(r.ok).toBe(false);
  });
});

function Keypairish(): string {
  return PublicKey.unique().toBase58();
}

describe("validateSolLimits", () => {
  it("requires daily >= max tx", () => {
    expect(validateSolLimits(5, 4)).toMatch(/daily/i);
    expect(validateSolLimits(5, 5)).toBeNull();
    expect(validateSolLimits(4, 10)).toBeNull();
  });

  it("rejects non-positive", () => {
    expect(validateSolLimits(0, 10)).toBeTruthy();
    expect(validateSolLimits(1, 0)).toBeTruthy();
  });
});

describe("validateSessionDays", () => {
  it("accepts 1–90", () => {
    expect(validateSessionDays(1)).toBeNull();
    expect(validateSessionDays(90)).toBeNull();
  });

  it("rejects out of range", () => {
    expect(validateSessionDays(0)).toBeTruthy();
    expect(validateSessionDays(91)).toBeTruthy();
    expect(validateSessionDays(3.5)).toBeTruthy();
  });
});

describe("pause reason", () => {
  it("requires non-empty", () => {
    expect(validatePauseReason("   ")).toMatch(/required/i);
  });

  it("accepts within byte limit", () => {
    expect(validatePauseReason("pause for review")).toBeNull();
  });

  it("truncates long utf8 safely", () => {
    const long = "あ".repeat(40);
    const t = truncatePauseReason(long);
    expect(new TextEncoder().encode(t).length).toBeLessThanOrEqual(64);
  });
});
