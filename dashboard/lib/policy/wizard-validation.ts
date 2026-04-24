import { PublicKey } from "@solana/web3.js";
import {
  MAX_ALLOWED_PROGRAMS,
  PAUSE_REASON_MAX_BYTES,
  SESSION_DAYS_MAX,
  SESSION_DAYS_MIN,
} from "@/lib/policy/constants";

export type ParsedProgramsResult =
  | { ok: true; programs: PublicKey[] }
  | { ok: false; message: string };

export function parseAllowedProgramAddresses(addresses: string[]): ParsedProgramsResult {
  const trimmed = [...new Set(addresses.map((a) => a.trim()).filter(Boolean))];
  if (trimmed.length === 0) {
    return { ok: false, message: "Add at least one allowed program." };
  }
  if (trimmed.length > MAX_ALLOWED_PROGRAMS) {
    return { ok: false, message: `At most ${MAX_ALLOWED_PROGRAMS} programs.` };
  }
  const programs: PublicKey[] = [];
  for (const s of trimmed) {
    try {
      programs.push(new PublicKey(s));
    } catch {
      return { ok: false, message: `Invalid program address: ${s}` };
    }
  }
  return { ok: true, programs };
}

export function validateSolLimits(maxTxSol: number, dailyBudgetSol: number): string | null {
  if (!Number.isFinite(maxTxSol) || maxTxSol <= 0) {
    return "Per-transaction cap must be a positive number.";
  }
  if (!Number.isFinite(dailyBudgetSol) || dailyBudgetSol <= 0) {
    return "Daily budget must be a positive number.";
  }
  if (dailyBudgetSol < maxTxSol) {
    return "Daily budget must be greater than or equal to the per-transaction cap.";
  }
  return null;
}

export function validateSessionDays(days: number): string | null {
  if (!Number.isInteger(days) || days < SESSION_DAYS_MIN || days > SESSION_DAYS_MAX) {
    return `Session length must be between ${SESSION_DAYS_MIN} and ${SESSION_DAYS_MAX} days.`;
  }
  return null;
}

/** Truncates to UTF-8 byte length at most `PAUSE_REASON_MAX_BYTES` without splitting codepoints badly. */
export function truncatePauseReason(reason: string): string {
  let out = "";
  for (const ch of reason) {
    const next = out + ch;
    if (new TextEncoder().encode(next).length > PAUSE_REASON_MAX_BYTES) break;
    out = next;
  }
  return out;
}

export function validatePauseReason(reason: string): string | null {
  const t = reason.trim();
  if (!t) {
    return "Pause reason is required.";
  }
  if (new TextEncoder().encode(t).length > PAUSE_REASON_MAX_BYTES) {
    return `Pause reason must be at most ${PAUSE_REASON_MAX_BYTES} bytes (UTF-8).`;
  }
  return null;
}

export function solToLamportsString(sol: number): string {
  if (!Number.isFinite(sol) || sol < 0) {
    throw new Error("Invalid SOL value");
  }
  const lamports = Math.round(sol * 1e9);
  if (lamports > Number.MAX_SAFE_INTEGER) {
    throw new Error("Amount too large");
  }
  return String(lamports);
}
