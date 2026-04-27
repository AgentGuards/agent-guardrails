// Environment variable validation and export.
// Validates at import time — if any required var is missing, the process exits
// with a clear error message listing all missing variables.

function required(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

function optional(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

function optionalKey(name: string): string | undefined {
  return process.env[name] || undefined;
}

function port(name: string, fallback: string): number {
  const raw = optional(name, fallback);
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`Invalid env var ${name}: "${raw}" (expected integer 1-65535)`);
  }
  return parsed;
}

function optionalNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid env var ${name}: "${raw}" (expected non-negative number)`);
  }
  return parsed;
}

// LLM API key — optional, enables AI judge + report generation.
const ANTHROPIC_API_KEY = optionalKey("ANTHROPIC_API_KEY");

// Webhook auth — at least one method must be set.
const HELIUS_WEBHOOK_SECRET = optionalKey("HELIUS_WEBHOOK_SECRET");
const HELIUS_AUTH_HEADER = optionalKey("HELIUS_AUTH_HEADER");

if (!HELIUS_WEBHOOK_SECRET && !HELIUS_AUTH_HEADER) {
  throw new Error(
    "At least one webhook auth method required: HELIUS_WEBHOOK_SECRET or HELIUS_AUTH_HEADER",
  );
}

if (!ANTHROPIC_API_KEY) {
  console.warn(
    "[env] ANTHROPIC_API_KEY not set. Judge will use rule-based fallback only.",
  );
}

export const env = {
  PORT: port("PORT", "8080"),
  SOLANA_RPC_URL: required("SOLANA_RPC_URL"),
  GUARDRAILS_PROGRAM_ID: required("GUARDRAILS_PROGRAM_ID"),
  MONITOR_KEYPAIR: required("MONITOR_KEYPAIR"),
  HELIUS_WEBHOOK_SECRET,
  HELIUS_AUTH_HEADER,
  ANTHROPIC_API_KEY,
  LLM_JUDGE_MODEL: optionalKey("LLM_JUDGE_MODEL"),
  LLM_REPORT_MODEL: optionalKey("LLM_REPORT_MODEL"),
  DATABASE_URL: required("DATABASE_URL"),
  DIRECT_URL: required("DIRECT_URL"),
  JWT_SECRET: required("JWT_SECRET"),
  CORS_ORIGIN: optional("CORS_ORIGIN", "http://localhost:3000"),
  POLL_INTERVAL_MS: optionalNumber("POLL_INTERVAL_MS", 30_000),
} as const;
