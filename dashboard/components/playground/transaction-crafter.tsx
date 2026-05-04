"use client";

import { useMemo } from "react";
import { POLICIES, PROGRAM_LABELS } from "@/lib/mock/policies";
import { PLAYGROUND_PROGRAM_OPTIONS } from "@/lib/playground/constants";
import { runSimulation } from "@/lib/playground/engine";
import type { CrafterParams, PlaygroundPolicySlice, SessionRemainingBucket } from "@/lib/playground/types";
import { usePoliciesQuery } from "@/lib/api/use-policies-query";
import type { PolicySummary } from "@/lib/types/dashboard";
import { usePlaygroundStore } from "@/lib/stores/playground";
import { VerdictPanel } from "./verdict-panel";
import { PlaygroundProgressBar } from "./progress-bar";

function resolvePolicies(remote: PolicySummary[] | undefined): PlaygroundPolicySlice[] {
  const list = remote?.length ? remote : POLICIES;
  return list.map((p) => ({
    pubkey: p.pubkey,
    maxTxLamports: p.maxTxLamports,
    dailyBudgetLamports: p.dailyBudgetLamports,
    allowedPrograms: p.allowedPrograms,
  }));
}

function policyLabel(p: PlaygroundPolicySlice): string {
  const full = POLICIES.find((x) => x.pubkey === p.pubkey);
  const lbl = full?.label;
  return lbl ? `${lbl}` : `${p.pubkey.slice(0, 4)}…${p.pubkey.slice(-4)}`;
}

function SessionSelect({
  value,
  onChange,
}: {
  value: SessionRemainingBucket;
  onChange: (v: SessionRemainingBucket) => void;
}) {
  const opts: { value: SessionRemainingBucket; label: string }[] = [
    { value: "gt24h", label: "> 24h remaining" },
    { value: "h1to6", label: "1–6 hours" },
    { value: "m30", label: "~30 minutes" },
    { value: "lt10min", label: "< 10 minutes" },
    { value: "expired", label: "Expired" },
  ];
  return (
    <select
      className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
      value={value}
      onChange={(e) => onChange(e.target.value as SessionRemainingBucket)}
    >
      {opts.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function shortProg(pk: string): string {
  return `${pk.slice(0, 4)}…`;
}

function SliderBlock({
  label,
  min,
  max,
  step,
  value,
  onChange,
  display,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  display: (v: number) => string;
}) {
  return (
    <label className="flex flex-col gap-2 text-xs text-zinc-400">
      <span className="flex justify-between">
        {label}
        <span className="font-mono text-zinc-300">{display(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-teal-500"
      />
    </label>
  );
}

export function TransactionCrafter() {
  const policiesQuery = usePoliciesQuery();
  const policies = useMemo(() => resolvePolicies(policiesQuery.data), [policiesQuery.data]);

  const crafterParams = usePlaygroundStore((s) => s.crafterParams);
  const crafterResult = usePlaygroundStore((s) => s.crafterResult);
  const crafterRunning = usePlaygroundStore((s) => s.crafterRunning);
  const crafterProgress = usePlaygroundStore((s) => s.crafterProgress);
  const setCrafterParams = usePlaygroundStore((s) => s.setCrafterParams);
  const setCrafterResult = usePlaygroundStore((s) => s.setCrafterResult);
  const setCrafterRunning = usePlaygroundStore((s) => s.setCrafterRunning);
  const setCrafterProgress = usePlaygroundStore((s) => s.setCrafterProgress);

  const selectedPolicy =
    policies.find((p) => p.pubkey === crafterParams.policyPubkey) ?? policies[0] ?? POLICIES[0];

  const effectivePubkey = crafterParams.policyPubkey ?? selectedPolicy?.pubkey ?? POLICIES[0]!.pubkey;

  const runJudge = async () => {
    const policy = policies.find((p) => p.pubkey === effectivePubkey) ?? policies[0];
    if (!policy) return;

    setCrafterRunning(true);
    setCrafterProgress(0);
    setCrafterResult(null);

    const params: CrafterParams = { ...crafterParams, policyPubkey: effectivePubkey };
    const duration = 900 + Math.floor(Math.random() * 400);
    const steps = 24;
    for (let i = 1; i <= steps; i++) {
      await new Promise((r) => setTimeout(r, duration / steps));
      setCrafterProgress((i / steps) * 100);
    }

    const result = runSimulation(params, policy);
    setCrafterResult(result);
    setCrafterRunning(false);
    setCrafterProgress(100);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
      <div className="panel-glow flex flex-col gap-5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
        <div>
          <h3 className="text-sm font-semibold text-zinc-200">Transaction parameters</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Tune inputs — simulation uses PLAYGROUND signal weights (frontend-only).
          </p>
        </div>

        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Agent policy
          <select
            className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
            value={effectivePubkey}
            onChange={(e) => setCrafterParams({ policyPubkey: e.target.value })}
          >
            {policies.map((p) => (
              <option key={p.pubkey} value={p.pubkey}>
                {policyLabel(p)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Target program
          <select
            className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
            value={crafterParams.targetProgram}
            onChange={(e) => setCrafterParams({ targetProgram: e.target.value })}
          >
            {PLAYGROUND_PROGRAM_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label} ({PROGRAM_LABELS[o.value] ?? shortProg(o.value)})
              </option>
            ))}
          </select>
        </label>

        <SliderBlock
          label="Amount (SOL)"
          min={0}
          max={50}
          step={0.1}
          value={crafterParams.amountSol}
          onChange={(amountSol) => setCrafterParams({ amountSol })}
          display={(v) => `${v.toFixed(1)} SOL`}
        />

        <SliderBlock
          label="Velocity (tx / min)"
          min={1}
          max={10}
          step={1}
          value={crafterParams.velocityPerMin}
          onChange={(velocityPerMin) => setCrafterParams({ velocityPerMin })}
          display={(v) => String(v)}
        />

        <SliderBlock
          label="Budget consumed"
          min={0}
          max={100}
          step={1}
          value={crafterParams.budgetConsumedPercent}
          onChange={(budgetConsumedPercent) => setCrafterParams({ budgetConsumedPercent })}
          display={(v) => `${v}%`}
        />

        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Session remaining
          <SessionSelect
            value={crafterParams.sessionRemaining}
            onChange={(sessionRemaining) => setCrafterParams({ sessionRemaining })}
          />
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            className="rounded border-white/20 bg-zinc-900"
            checked={crafterParams.isProgramNew}
            onChange={(e) => setCrafterParams({ isProgramNew: e.target.checked })}
          />
          Treat target as new / uncommon
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            className="rounded border-white/20 bg-zinc-900"
            checked={crafterParams.outsideActiveHours}
            onChange={(e) => setCrafterParams({ outsideActiveHours: e.target.checked })}
          />
          Outside active hours
        </label>

        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            disabled={crafterRunning}
            className="button button-primary w-full py-2 text-sm disabled:opacity-50"
            onClick={() => void runJudge()}
          >
            {crafterRunning ? "Running judge…" : "Run Judge"}
          </button>
          {crafterRunning ? (
            <PlaygroundProgressBar progress={crafterProgress} durationMs={150} />
          ) : null}
        </div>
      </div>

      <VerdictPanel result={crafterResult} latencyDisplay={crafterResult?.latencyMs ?? null} />
    </div>
  );
}
