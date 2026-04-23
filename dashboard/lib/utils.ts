import { PROGRAM_LABELS, POLICIES } from "./mock";

const LAMPORTS_PER_SOL = 1_000_000_000;

export function lamportsToSol(lamports: string | number | null | undefined): number {
  if (lamports == null) return 0;
  return Number(lamports) / LAMPORTS_PER_SOL;
}

export function solToLamports(sol: number): string {
  return Math.round(sol * LAMPORTS_PER_SOL).toString();
}

export function shortAddress(value: string, start = 4, end = 4): string {
  if (value.length <= start + end) return value;
  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatRelativeTime(value: string): string {
  const diffMs = new Date(value).getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const absMinutes = Math.abs(diffMinutes);
  if (absMinutes < 60) return `${absMinutes}m ${diffMinutes < 0 ? "ago" : "from now"}`;
  const diffHours = Math.round(diffMinutes / 60);
  const absHours = Math.abs(diffHours);
  if (absHours < 24) return `${absHours}h ${diffHours < 0 ? "ago" : "from now"}`;
  const diffDays = Math.round(diffHours / 24);
  return `${Math.abs(diffDays)}d ${diffDays < 0 ? "ago" : "from now"}`;
}

export function programLabel(program: string): string {
  return PROGRAM_LABELS[program] ?? shortAddress(program, 6, 4);
}

export function policyLabel(policyPubkey: string): string {
  return POLICIES.find((policy) => policy.pubkey === policyPubkey)?.label ?? shortAddress(policyPubkey, 6, 4);
}

export function statusTone({
  isActive,
  sessionExpiry,
}: {
  isActive: boolean;
  sessionExpiry: string;
}): "green" | "amber" | "red" {
  if (!isActive) return "red";
  if (new Date(sessionExpiry).getTime() < Date.now()) return "amber";
  return "green";
}

export function verdictTone(verdict: string | null | undefined): "green" | "amber" | "red" | "slate" {
  if (verdict === "allow") return "green";
  if (verdict === "flag") return "amber";
  if (verdict === "pause") return "red";
  return "slate";
}
