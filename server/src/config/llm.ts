// LLM provider — Anthropic only.
// Override models via LLM_JUDGE_MODEL and LLM_REPORT_MODEL env vars.

import { env } from "./env.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LLMResponse {
  text: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
}

export interface LLMCallOptions {
  system: string;
  userMessage: string;
  maxTokens: number;
  /** Which model tier to use — "fast" picks the cheapest, "report" picks the most capable. */
  tier: "fast" | "report";
}

// ---------------------------------------------------------------------------
// Default models
// ---------------------------------------------------------------------------

const DEFAULTS = {
  fast: "claude-haiku-4-5-20251001",
  report: "claude-haiku-4-5-20251001",
};

function resolveModel(tier: "fast" | "report"): string {
  const envOverride = tier === "fast" ? env.LLM_JUDGE_MODEL : env.LLM_REPORT_MODEL;
  return envOverride || DEFAULTS[tier];
}

/** Resolved models + fallback flags for dashboard settings (read-only). */
export function getDashboardLLMInfo(): {
  judgeModel: string;
  reportModel: string;
  anthropicConfigured: boolean;
  fallbackActive: boolean;
} {
  return {
    judgeModel: resolveModel("fast"),
    reportModel: resolveModel("report"),
    anthropicConfigured: Boolean(env.ANTHROPIC_API_KEY),
    fallbackActive: !env.ANTHROPIC_API_KEY,
  };
}

// ---------------------------------------------------------------------------
// Anthropic provider
// ---------------------------------------------------------------------------

let _anthropicClient: any = null;

async function callAnthropic(opts: LLMCallOptions): Promise<LLMResponse> {
  if (!_anthropicClient) {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    _anthropicClient = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY! });
  }

  const model = resolveModel(opts.tier);

  const response = await _anthropicClient.messages.create({
    model,
    max_tokens: opts.maxTokens,
    system: opts.system,
    messages: [{ role: "user", content: opts.userMessage }],
  });

  const text = response.content
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("");
  return {
    text,
    model: "guardian",
    promptTokens: response.usage.input_tokens,
    completionTokens: response.usage.output_tokens,
  };
}

// ---------------------------------------------------------------------------
// Provider selection
// ---------------------------------------------------------------------------

type ProviderName = "anthropic" | "none";

/** No-key fallback — throws so the judge's catch block triggers the rule-based fallback. */
async function callNone(_opts: LLMCallOptions): Promise<LLMResponse> {
  throw new Error("No LLM API key configured — using rule-based fallback");
}

function selectProvider(): { name: ProviderName; call: (opts: LLMCallOptions) => Promise<LLMResponse> } {
  if (env.ANTHROPIC_API_KEY) return { name: "anthropic", call: callAnthropic };
  return { name: "none", call: callNone };
}

const provider = selectProvider();

/** The active LLM provider name (for logging and DB records). */
export const llmProviderName: ProviderName = provider.name;

/** Call the active LLM provider. */
export const llmCall = provider.call;

if (provider.name === "none") {
  console.log(`[llm] no provider configured — rule-based fallback only`);
} else {
  const judgeModel = resolveModel("fast");
  const reportModel = resolveModel("report");
  console.log(`[llm] provider=guardian (anthropic) judge=${judgeModel} report=${reportModel}`);
}
