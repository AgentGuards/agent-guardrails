"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { X, Play, Square, CheckCircle2, XCircle, ExternalLink, Zap, Shield, Wrench } from "lucide-react";
import { toast } from "sonner";
import { useSimulationStore, type SimulationMode } from "@/lib/stores/simulation";
import { useSimulationRunner } from "@/hooks/use-simulation-runner";
import type { PolicySummary } from "@/lib/types/dashboard";

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

const MODE_CONFIG: { key: SimulationMode; label: string; icon: typeof Shield }[] = [
  { key: "honest", label: "Honest", icon: Shield },
  { key: "attack", label: "Attack", icon: Zap },
  { key: "custom", label: "Custom", icon: Wrench },
];

function shortenSig(sig: string): string {
  return sig.length > 16 ? `${sig.slice(0, 8)}...${sig.slice(-8)}` : sig;
}

function shortenKey(key: string): string {
  return key.length > 8 ? `${key.slice(0, 4)}...${key.slice(-4)}` : key;
}

export function SimulatePanel({ policy }: { policy: PolicySummary }) {
  const sim = useSimulationStore();
  const { start, stop } = useSimulationRunner(policy);
  const logEndRef = useRef<HTMLDivElement>(null);

  const [agentBalance, setAgentBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [airdropping, setAirdropping] = useState(false);

  const keyMatchesAgent =
    sim.derivedPubkey !== null && sim.derivedPubkey === policy.agent;
  const keyValid = sim.agentKeypairBytes !== null;

  // Fetch agent SOL balance when key is validated
  useEffect(() => {
    if (!keyValid || !sim.derivedPubkey) {
      setAgentBalance(null);
      return;
    }
    let cancelled = false;
    setBalanceLoading(true);
    const conn = new Connection(RPC_URL, "confirmed");
    conn
      .getBalance(new PublicKey(sim.derivedPubkey))
      .then((bal) => {
        if (!cancelled) setAgentBalance(bal / LAMPORTS_PER_SOL);
      })
      .catch(() => {
        if (!cancelled) setAgentBalance(null);
      })
      .finally(() => {
        if (!cancelled) setBalanceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [keyValid, sim.derivedPubkey]);

  // Auto-scroll log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sim.log.length]);

  const handleAirdrop = useCallback(async () => {
    if (!sim.derivedPubkey) return;
    setAirdropping(true);
    try {
      const conn = new Connection(RPC_URL, "confirmed");
      const sig = await conn.requestAirdrop(
        new PublicKey(sim.derivedPubkey),
        1 * LAMPORTS_PER_SOL,
      );
      await conn.confirmTransaction(sig, "confirmed");
      const bal = await conn.getBalance(new PublicKey(sim.derivedPubkey));
      setAgentBalance(bal / LAMPORTS_PER_SOL);
      toast.success("Airdropped 1 SOL");
    } catch {
      toast.error("Airdrop failed — devnet may be rate-limited");
    } finally {
      setAirdropping(false);
    }
  }, [sim.derivedPubkey]);

  const canStart =
    keyValid &&
    keyMatchesAgent &&
    policy.isActive &&
    !sim.isRunning &&
    agentBalance !== null &&
    agentBalance > 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={() => {
          if (!sim.isRunning) sim.setPanelOpen(false);
        }}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[480px] flex-col border-l border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h2 className="text-lg font-semibold text-zinc-100">
            Simulate Transactions
          </h2>
          <button
            type="button"
            className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
            onClick={() => {
              if (sim.isRunning) {
                stop();
              }
              sim.setPanelOpen(false);
            }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-5">
            {/* Secret Key Input */}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-500">
                Agent Secret Key
              </label>
              <textarea
                className="h-20 w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 font-mono text-xs text-zinc-200 outline-none transition-colors placeholder:text-zinc-600 focus:border-blue-700/60 focus:ring-1 focus:ring-blue-500/30"
                placeholder="Paste the base64 secret key from policy creation..."
                value={sim.secretKeyInput}
                onChange={(e) => sim.setSecretKeyInput(e.target.value)}
                disabled={sim.isRunning}
              />
              {sim.secretKeyInput.trim() !== "" && (
                <div className="mt-1.5">
                  {sim.keyError ? (
                    <p className="flex items-center gap-1.5 text-xs text-red-400">
                      <XCircle className="h-3.5 w-3.5 shrink-0" />
                      {sim.keyError}
                    </p>
                  ) : keyMatchesAgent ? (
                    <p className="flex items-center gap-1.5 text-xs text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      Matches policy agent ({shortenKey(policy.agent)})
                    </p>
                  ) : (
                    <p className="flex items-center gap-1.5 text-xs text-amber-400">
                      <XCircle className="h-3.5 w-3.5 shrink-0" />
                      Key derives {shortenKey(sim.derivedPubkey ?? "")}, expected{" "}
                      {shortenKey(policy.agent)}
                    </p>
                  )}
                </div>
              )}
              <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-600">
                Your secret key is used only in this browser tab to sign
                transactions. It is never sent to any server.
              </p>
            </div>

            {/* Pre-flight checks */}
            {keyValid && keyMatchesAgent && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Pre-flight
                </p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Policy status</span>
                    <span
                      className={
                        policy.isActive ? "text-emerald-400" : "text-red-400"
                      }
                    >
                      {policy.isActive ? "Active" : "Paused"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Session expiry</span>
                    <span
                      className={
                        new Date(policy.sessionExpiry) > new Date()
                          ? "text-zinc-200"
                          : "text-red-400"
                      }
                    >
                      {new Date(policy.sessionExpiry).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Agent SOL balance</span>
                    <span className="text-zinc-200">
                      {balanceLoading
                        ? "..."
                        : agentBalance !== null
                          ? `${agentBalance.toFixed(4)} SOL`
                          : "N/A"}
                    </span>
                  </div>
                </div>
                {agentBalance !== null && agentBalance < 0.005 && (
                  <button
                    type="button"
                    className="mt-2.5 w-full rounded-md border border-blue-800/50 bg-blue-950/40 px-3 py-1.5 text-xs font-medium text-blue-300 transition-colors hover:bg-blue-950/60 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={airdropping}
                    onClick={() => void handleAirdrop()}
                  >
                    {airdropping ? "Requesting..." : "Airdrop 1 SOL (devnet)"}
                  </button>
                )}
              </div>
            )}

            {/* Mode selector */}
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
                Mode
              </p>
              <div className="flex gap-2">
                {MODE_CONFIG.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                      sim.mode === key
                        ? "border-blue-700/60 bg-blue-950/50 text-blue-300 shadow-[0_0_12px_hsl(220_80%_50%/0.15)]"
                        : "border-zinc-700 bg-zinc-900/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
                    }`}
                    disabled={sim.isRunning}
                    onClick={() => sim.setMode(key)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-zinc-600">
                {sim.mode === "honest" &&
                  "Small transfers (0.001-0.005 SOL) every 15s, up to 20 txns."}
                {sim.mode === "attack" &&
                  "2 normal txns, then 5 escalating large transfers to trigger guardrails."}
                {sim.mode === "custom" && "Configure your own parameters below."}
              </p>
            </div>

            {/* Custom params */}
            {sim.mode === "custom" && (
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-xs text-zinc-400">
                  Min amount (SOL)
                  <input
                    type="number"
                    min="0.0001"
                    step="0.001"
                    className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-2.5 py-1.5 text-sm text-zinc-100 outline-none focus:border-blue-700/60 focus:ring-1 focus:ring-blue-500/30"
                    value={sim.customParams.minAmountSol}
                    onChange={(e) =>
                      sim.setCustomParams({
                        minAmountSol: Number.parseFloat(e.target.value) || 0,
                      })
                    }
                    disabled={sim.isRunning}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-zinc-400">
                  Max amount (SOL)
                  <input
                    type="number"
                    min="0.0001"
                    step="0.001"
                    className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-2.5 py-1.5 text-sm text-zinc-100 outline-none focus:border-blue-700/60 focus:ring-1 focus:ring-blue-500/30"
                    value={sim.customParams.maxAmountSol}
                    onChange={(e) =>
                      sim.setCustomParams({
                        maxAmountSol: Number.parseFloat(e.target.value) || 0,
                      })
                    }
                    disabled={sim.isRunning}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-zinc-400">
                  Interval (sec)
                  <input
                    type="number"
                    min="1"
                    step="1"
                    className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-2.5 py-1.5 text-sm text-zinc-100 outline-none focus:border-blue-700/60 focus:ring-1 focus:ring-blue-500/30"
                    value={sim.customParams.intervalSec}
                    onChange={(e) =>
                      sim.setCustomParams({
                        intervalSec: Number.parseInt(e.target.value, 10) || 1,
                      })
                    }
                    disabled={sim.isRunning}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-zinc-400">
                  Max transactions
                  <input
                    type="number"
                    min="1"
                    step="1"
                    className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-2.5 py-1.5 text-sm text-zinc-100 outline-none focus:border-blue-700/60 focus:ring-1 focus:ring-blue-500/30"
                    value={sim.customParams.maxTransactions}
                    onChange={(e) =>
                      sim.setCustomParams({
                        maxTransactions:
                          Number.parseInt(e.target.value, 10) || 1,
                      })
                    }
                    disabled={sim.isRunning}
                  />
                </label>
              </div>
            )}

            {/* Start / Stop */}
            <div className="flex gap-2">
              <button
                type="button"
                className="button button-primary flex flex-1 items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canStart}
                onClick={() => start()}
              >
                <Play className="h-4 w-4" />
                Start Simulation
              </button>
              {sim.isRunning && (
                <button
                  type="button"
                  className="button rounded-md border border-red-800 bg-red-950/40 text-red-200 hover:bg-red-950/70"
                  onClick={() => stop()}
                >
                  <Square className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Counters */}
            {(sim.sentCount > 0 || sim.isRunning) && (
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-2.5 text-center">
                  <p className="text-xs uppercase tracking-wider text-zinc-500">
                    Sent
                  </p>
                  <p className="mt-0.5 text-lg font-semibold text-zinc-200">
                    {sim.sentCount}
                  </p>
                </div>
                <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-2.5 text-center">
                  <p className="text-xs uppercase tracking-wider text-emerald-600">
                    Succeeded
                  </p>
                  <p className="mt-0.5 text-lg font-semibold text-emerald-400">
                    {sim.successCount}
                  </p>
                </div>
                <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-2.5 text-center">
                  <p className="text-xs uppercase tracking-wider text-red-600">
                    Failed
                  </p>
                  <p className="mt-0.5 text-lg font-semibold text-red-400">
                    {sim.failedCount}
                  </p>
                </div>
              </div>
            )}

            {/* Stop reason banner */}
            {sim.stopReason && (
              <div
                className={`rounded-lg border px-3 py-2 text-sm ${
                  sim.stopReason.includes("6000") || sim.stopReason.includes("6004")
                    ? "border-red-900/50 bg-red-950/30 text-red-300"
                    : "border-amber-900/50 bg-amber-950/30 text-amber-300"
                }`}
              >
                {sim.stopReason}
              </div>
            )}

            {/* Live log */}
            {sim.log.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Transaction Log
                </p>
                <div className="max-h-[300px] overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900/30">
                  {sim.log.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start gap-2 border-b border-zinc-800/50 px-3 py-2 last:border-b-0"
                    >
                      <span className="mt-0.5 w-5 shrink-0 text-right font-mono text-xs text-zinc-600">
                        {entry.txIndex}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-zinc-400">
                            {entry.amountSol} SOL
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                              entry.status === "success"
                                ? "bg-emerald-950/50 text-emerald-400"
                                : "bg-red-950/50 text-red-400"
                            }`}
                          >
                            {entry.status}
                          </span>
                          <span className="text-[10px] text-zinc-600">
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        {entry.signature ? (
                          <a
                            href={`https://explorer.solana.com/tx/${entry.signature}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-0.5 inline-flex items-center gap-1 font-mono text-[11px] text-blue-400 hover:text-blue-300"
                          >
                            {shortenSig(entry.signature)}
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        ) : entry.error ? (
                          <p className="mt-0.5 truncate text-[11px] text-red-400/80">
                            {entry.error.length > 120
                              ? `${entry.error.slice(0, 120)}...`
                              : entry.error}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  <div ref={logEndRef} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
