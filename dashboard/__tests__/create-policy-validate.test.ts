import { describe, expect, it } from "vitest";
import {
  isValidPubkeyString,
  validateEscalation,
  validateLimits,
  validatePrograms,
  validateSession,
  validateStep,
} from "@/lib/create-policy/validate";

describe("isValidPubkeyString", () => {
  it("accepts known base58 pubkeys", () => {
    expect(isValidPubkeyString("11111111111111111111111111111111")).toBe(true);
    expect(isValidPubkeyString("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4")).toBe(true);
  });

  it("rejects empty and invalid", () => {
    expect(isValidPubkeyString("")).toBe(false);
    expect(isValidPubkeyString("not-a-pubkey")).toBe(false);
  });
});

describe("validatePrograms", () => {
  it("requires at least one program", () => {
    expect(validatePrograms([]).allowedPrograms).toBeDefined();
  });

  it("rejects more than 10", () => {
    const many = Array.from({ length: 11 }, () => "11111111111111111111111111111111");
    expect(validatePrograms(many).allowedPrograms).toContain("Maximum");
  });

  it("accepts valid list", () => {
    expect(Object.keys(validatePrograms(["JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"])).length).toBe(0);
  });
});

describe("validateLimits", () => {
  it("requires daily >= max tx", () => {
    const e = validateLimits(10, 5);
    expect(e.dailyBudgetSol).toBeDefined();
  });

  it("accepts equal bounds", () => {
    expect(Object.keys(validateLimits(5, 5)).length).toBe(0);
  });

  it("rejects non-positive", () => {
    expect(validateLimits(0, 10).maxTxSol).toBeDefined();
    expect(validateLimits(5, -1).dailyBudgetSol).toBeDefined();
  });
});

describe("validateSession", () => {
  it("requires integer 1–90", () => {
    expect(validateSession(0).sessionDays).toBeDefined();
    expect(validateSession(91).sessionDays).toBeDefined();
    expect(validateSession(3.5).sessionDays).toBeDefined();
  });

  it("accepts whole days in range", () => {
    expect(Object.keys(validateSession(30)).length).toBe(0);
  });
});

describe("validateEscalation", () => {
  const baseDraft = {
    label: "",
    allowedPrograms: ["11111111111111111111111111111111"],
    maxTxSol: 5,
    dailyBudgetSol: 50,
    sessionDays: 30,
    escalationEnabled: false,
    multisigMode: "existing" as const,
    squadsMultisig: "",
    multisigMembers: [],
    multisigThreshold: 1,
    escalationThresholdSol: 0,
  };

  it("skips when disabled", () => {
    expect(Object.keys(validateEscalation(baseDraft)).length).toBe(0);
  });

  it("requires multisig address in existing mode", () => {
    const draft = { ...baseDraft, escalationEnabled: true, escalationThresholdSol: 1 };
    expect(validateEscalation(draft).squadsMultisig).toBeDefined();
  });

  it("requires threshold when enabled", () => {
    const draft = { ...baseDraft, escalationEnabled: true, squadsMultisig: "11111111111111111111111111111111" };
    expect(validateEscalation(draft).escalationThresholdSol).toBeDefined();
  });

  it("accepts valid existing-mode escalation", () => {
    const draft = {
      ...baseDraft,
      escalationEnabled: true,
      squadsMultisig: "11111111111111111111111111111111",
      escalationThresholdSol: 2.5,
    };
    expect(Object.keys(validateEscalation(draft)).length).toBe(0);
  });

  it("requires >= 2 members in create mode", () => {
    const draft = {
      ...baseDraft,
      escalationEnabled: true,
      multisigMode: "create" as const,
      multisigMembers: ["11111111111111111111111111111111"],
      multisigThreshold: 1,
      escalationThresholdSol: 2,
    };
    expect(validateEscalation(draft).multisigMembers).toBeDefined();
  });

  it("accepts valid create-mode escalation", () => {
    const draft = {
      ...baseDraft,
      escalationEnabled: true,
      multisigMode: "create" as const,
      multisigMembers: [
        "11111111111111111111111111111111",
        "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      ],
      multisigThreshold: 2,
      escalationThresholdSol: 2,
    };
    expect(Object.keys(validateEscalation(draft)).length).toBe(0);
  });
});

describe("validateStep", () => {
  const base = {
    label: "",
    allowedPrograms: ["11111111111111111111111111111111"],
    maxTxSol: 5,
    dailyBudgetSol: 50,
    sessionDays: 30,
    escalationEnabled: false,
    multisigMode: "existing" as const,
    squadsMultisig: "",
    multisigMembers: [],
    multisigThreshold: 1,
    escalationThresholdSol: 0,
  };

  it("returns ok for valid steps 0–2", () => {
    expect(validateStep(0, base).ok).toBe(true);
    expect(validateStep(1, base).ok).toBe(true);
    expect(validateStep(2, base).ok).toBe(true);
  });

  it("step 3 validates escalation when enabled", () => {
    expect(
      validateStep(3, {
        ...base,
        escalationEnabled: true,
        squadsMultisig: "",
        escalationThresholdSol: 1,
      }).ok,
    ).toBe(false);
  });
});
