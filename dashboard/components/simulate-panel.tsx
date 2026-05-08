"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { X, Play, Square, CheckCircle2, XCircle, ExternalLink, Zap, Shield, Wrench, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useSimulationStore, type SimulationMode } from "@/lib/stores/simulation";
import { useSimulationRunner } from "@/hooks/use-simulation-runner";
import type { PolicySummary } from "@/lib/types/dashboard";

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

const MODE_CONFIG: { key: SimulationMode; label: string; desc: string; icon: typeof Shield }[] = [
  { key: "honest", label: "Honest", desc: "Small transfers every 15s, up to 20 txns", icon: Shield },
  { key: "attack", label: "Attack", desc: "2 normal, then 5 escalating to trigger guardrails", icon: Zap },
  { key: "custom", label: "Custom", desc: "Configure your own parameters", icon: Wrench },
];

function shortenSig(sig: string): string {
  return sig.length > 16 ? `${sig.slice(0, 8)}...${sig.slice(-8)}` : sig;
}

function shortenKey(key: string): string {
  return key.length > 8 ? `${key.slice(0, 4)}...${key.slice(-4)}` : key;
}

const inputClass = "w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[13px] text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-teal-500/30 focus:ring-1 focus:ring-teal-500/20";

export function SimulatePanel({ policy }: { policy: PolicySummary }) {
  const sim = useSimulationStore();
  const { start, stop } = useSimulationRunner(policy);
  const logEndRef = useRef<HTMLDivElement>(null);

  const [agentBalance, setAgentBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [airdropping, setAirdropping] = useState(false);
  const [fundingFromWallet, setFundingFromWallet] = useState(false);
  const { publicKey: walletPubkey, sendTransaction } = useWallet();

  const keyMatchesAgent = sim.derivedPubkey !== null && sim.derivedPubkey === policy.agent;
  const keyValid = sim.agentKeypairBytes !== null;

  useEffect(() => {
    if (!keyValid || !sim.derivedPubkey) { setAgentBalance(null); return; }
    let cancelled = false;
    setBalanceLoading(true);
    const conn = new Connection(RPC_URL, "confirmed");
    conn.getBalance(new PublicKey(sim.derivedPubkey))
      .then((bal) => { if (!cancelled) setAgentBalance(bal / LAMPORTS_PER_SOL); })
      .catch(() => { if (!cancelled) setAgentBalance(null); })
      .finally(() => { if (!cancelled) setBalanceLoading(false); });
    return () => { cancelled = true; };
  }, [keyValid, sim.derivedPubkey]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sim.log.length]);

  const handleAirdrop = useCallback(async () => {
    if (!sim.derivedPubkey) return;
    setAirdropping(true);
    try {
      const conn = new Connection(RPC_URL, "confirmed");
      const sig = await conn.requestAirdrop(new PublicKey(sim.derivedPubkey), 1 * LAMPORTS_PER_SOL);
      await conn.confirmTransaction(sig, "confirmed");
      const bal = await conn.getBalance(new PublicKey(sim.derivedPubkey));
      setAgentBalance(bal / LAMPORTS_PER_SOL);
      toast.success("Airdropped 1 SOL");
    } catch { toast.error("Airdrop failed — devnet may be rate-limited"); }
    finally { setAirdropping(false); }
  }, [sim.derivedPubkey]);

  const handleFundFromWallet = useCallback(async () => {
    if (!sim.derivedPubkey || !walletPubkey || !sendTransaction) return;
    setFundingFromWallet(true);
    try {
      const conn = new Connection(RPC_URL, "confirmed");
      const tx = new Transaction().add(SystemProgram.transfer({ fromPubkey: walletPubkey, toPubkey: new PublicKey(sim.derivedPubkey), lamports: 0.01 * LAMPORTS_PER_SOL }));
      const sig = await sendTransaction(tx, conn);
      await conn.confirmTransaction(sig, "confirmed");
      const bal = await conn.getBalance(new PublicKey(sim.derivedPubkey));
      setAgentBalance(bal / LAMPORTS_PER_SOL);
      toast.success("Sent 0.01 SOL from wallet");
    } catch { toast.error("Transfer failed"); }
    finally { setFundingFromWallet(false); }
  }, [sim.derivedPubkey, walletPubkey, sendTransaction]);

  const canStart = keyValid && keyMatchesAgent && policy.isActive && !sim.isRunning && agentBalance !== null && agentBalance > 0;

  const closePanel = () => {
    if (sim.isRunning) stop();
    sim.setPanelOpen(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={() => { if (!sim.isRunning) closePanel(); }}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[480px] flex-col overflow-hidden border-l border-white/[0.06] bg-zinc-950 shadow-[0_0_60px_-10px_rgba(0,0,0,0.8)]">

        {/* Accent bar */}
        <div className="h-px w-full shrink-0 bg-gradient-to-r from-transparent via-teal-500/50 to-transparent" />

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-teal-500/20 bg-teal-500/10">
              <Play size={16} className="text-teal-400" strokeWidth={1.8} />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-zinc-100">Simulate</h2>
              <p className="text-[11px] text-zinc-500">Test agent transactions against guardrails</p>
            </div>
          </div>
          <button
            type="button"
            onClick={closePanel}
            className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-300"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="space-y-5">

            {/* ── Secret Key ── */}
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                Agent Secret Key
              </div>
              <textarea
                className="h-16 w-full resize-none rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 font-mono text-[11px] text-zinc-200 outline-none transition-colors placeholder:text-zinc-600 focus:border-teal-500/30 focus:ring-1 focus:ring-teal-500/20"
                placeholder="Paste the base64 secret key from policy creation..."
                value={sim.secretKeyInput}
                onChange={(e) => sim.setSecretKeyInput(e.target.value)}
                disabled={sim.isRunning}
              />
              {sim.secretKeyInput.trim() !== "" && (
                <div className="mt-1.5">
                  {sim.keyError ? (
                    <p className="flex items-center gap-1.5 text-[11px] text-red-400">
                      <XCircle className="h-3 w-3 shrink-0" /> {sim.keyError}
                    </p>
                  ) : keyMatchesAgent ? (
                    <p className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                      <CheckCircle2 className="h-3 w-3 shrink-0" /> Matches agent ({shortenKey(policy.agent)})
                    </p>
                  ) : (
                    <p className="flex items-center gap-1.5 text-[11px] text-amber-400">
                      <XCircle className="h-3 w-3 shrink-0" /> Key derives {shortenKey(sim.derivedPubkey ?? "")}, expected {shortenKey(policy.agent)}
                    </p>
                  )}
                </div>
              )}
              <p className="mt-1.5 text-[10px] text-zinc-600">
                Used only in this browser tab to sign transactions. Never sent to any server.
              </p>
            </div>

            {/* ── Pre-flight ── */}
            {keyValid && keyMatchesAgent && (
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                  Pre-flight Checks
                </div>
                <div className="space-y-2.5">
                  {[
                    { label: "Policy status", value: policy.isActive ? "Active" : "Paused", ok: policy.isActive },
                    { label: "Session", value: new Date(policy.sessionExpiry) > new Date() ? "Valid" : "Expired", ok: new Date(policy.sessionExpiry) > new Date() },
                    { label: "Agent balance", value: balanceLoading ? "..." : agentBalance !== null ? `${agentBalance.toFixed(4)} SOL` : "N/A", ok: agentBalance !== null && agentBalance > 0 },
                  ].map((check) => (
                    <div key={check.label} className="flex items-center justify-between">
                      <span className="text-[12px] text-zinc-400">{check.label}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[12px] font-medium ${check.ok ? "text-emerald-400" : "text-red-400"}`}>
                          {check.value}
                        </span>
                        {check.ok
                          ? <CheckCircle2 size={12} className="text-emerald-500" />
                          : <XCircle size={12} className="text-red-500" />}
                      </div>
                    </div>
                  ))}
                </div>
                {agentBalance !== null && agentBalance < 0.005 && (
                  <div className="mt-3 flex gap-2 border-t border-white/[0.06] pt-3">
                    <button
                      type="button"
                      disabled={fundingFromWallet}
                      onClick={() => void handleFundFromWallet()}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-teal-500/20 bg-teal-500/[0.06] py-2 text-[11px] font-medium text-teal-400 transition-all hover:bg-teal-500/[0.12] disabled:opacity-50"
                    >
                      <Wallet size={12} />
                      {fundingFromWallet ? "Sending..." : "Fund 0.01 SOL"}
                    </button>
                    <button
                      type="button"
                      disabled={airdropping}
                      onClick={() => void handleAirdrop()}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.03] py-2 text-[11px] font-medium text-zinc-400 transition-all hover:bg-white/[0.06] disabled:opacity-50"
                    >
                      {airdropping ? "Requesting..." : "Airdrop 1 SOL"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Mode Selector ── */}
            <div>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                Simulation Mode
              </div>
              <div className="flex flex-col gap-1.5">
                {MODE_CONFIG.map(({ key, label, desc, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    disabled={sim.isRunning}
                    onClick={() => sim.setMode(key)}
                    className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                      sim.mode === key
                        ? "border-teal-500/25 bg-teal-500/[0.06] shadow-[0_0_12px_rgba(0,255,209,0.06)]"
                        : "border-white/[0.06] bg-transparent hover:border-zinc-600 hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                      sim.mode === key ? "bg-teal-500/15 text-teal-400" : "bg-white/[0.04] text-zinc-500"
                    }`}>
                      <Icon size={14} />
                    </div>
                    <div>
                      <div className={`text-[12px] font-semibold ${sim.mode === key ? "text-zinc-100" : "text-zinc-400"}`}>
                        {label}
                      </div>
                      <div className="text-[10px] text-zinc-600">{desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Custom Params ── */}
            {sim.mode === "custom" && (
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                <div>
                  <div className="mb-1.5 text-[10px] text-zinc-500">Min amount (SOL)</div>
                  <input
                    type="text" inputMode="decimal"
                    className={inputClass}
                    value={sim.customParams.minAmountSol}
                    onChange={(e) => sim.setCustomParams({ minAmountSol: Number.parseFloat(e.target.value) || 0 })}
                    disabled={sim.isRunning}
                  />
                </div>
                <div>
                  <div className="mb-1.5 text-[10px] text-zinc-500">Max amount (SOL)</div>
                  <input
                    type="text" inputMode="decimal"
                    className={inputClass}
                    value={sim.customParams.maxAmountSol}
                    onChange={(e) => sim.setCustomParams({ maxAmountSol: Number.parseFloat(e.target.value) || 0 })}
                    disabled={sim.isRunning}
                  />
                </div>
                <div>
                  <div className="mb-1.5 text-[10px] text-zinc-500">Interval (sec)</div>
                  <input
                    type="text" inputMode="numeric"
                    className={inputClass}
                    value={sim.customParams.intervalSec}
                    onChange={(e) => sim.setCustomParams({ intervalSec: Number.parseInt(e.target.value, 10) || 1 })}
                    disabled={sim.isRunning}
                  />
                </div>
                <div>
                  <div className="mb-1.5 text-[10px] text-zinc-500">Max transactions</div>
                  <input
                    type="text" inputMode="numeric"
                    className={inputClass}
                    value={sim.customParams.maxTransactions}
                    onChange={(e) => sim.setCustomParams({ maxTransactions: Number.parseInt(e.target.value, 10) || 1 })}
                    disabled={sim.isRunning}
                  />
                </div>
              </div>
            )}

            {/* ── Start / Stop ── */}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!canStart}
                onClick={() => start()}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-teal-500/30 bg-teal-600 py-2.5 text-[13px] font-semibold text-white shadow-[0_0_12px_rgba(0,255,209,0.15)] transition-all hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Play size={14} /> Start Simulation
              </button>
              {sim.isRunning && (
                <button
                  type="button"
                  onClick={() => stop()}
                  className="flex items-center justify-center rounded-lg border border-red-500/30 bg-red-600 px-4 py-2.5 text-white shadow-[0_0_12px_rgba(239,68,68,0.2)] transition-all hover:bg-red-500"
                >
                  <Square size={14} />
                </button>
              )}
            </div>

            {/* ── Counters ── */}
            {(sim.sentCount > 0 || sim.isRunning) && (
              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-center">
                  <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Sent</div>
                  <div className="mt-1 font-mono text-lg font-bold text-zinc-200">{sim.sentCount}</div>
                </div>
                <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/[0.04] p-3 text-center">
                  <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-emerald-600">Succeeded</div>
                  <div className="mt-1 font-mono text-lg font-bold text-emerald-400">{sim.successCount}</div>
                </div>
                <div className="rounded-lg border border-red-500/15 bg-red-500/[0.04] p-3 text-center">
                  <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-red-600">Failed</div>
                  <div className="mt-1 font-mono text-lg font-bold text-red-400">{sim.failedCount}</div>
                </div>
              </div>
            )}

            {/* ── Stop reason ── */}
            {sim.stopReason && (
              <div className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[12px] ${
                sim.stopReason.includes("6000") || sim.stopReason.includes("6004")
                  ? "border-red-500/20 bg-red-500/[0.06] text-red-300"
                  : "border-amber-500/20 bg-amber-500/[0.06] text-amber-300"
              }`}>
                <XCircle size={14} className="mt-0.5 shrink-0" />
                {sim.stopReason}
              </div>
            )}

            {/* ── Transaction Log ── */}
            {sim.log.length > 0 && (
              <div>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                  Transaction Log
                </div>
                <div className="max-h-[280px] overflow-y-auto rounded-lg border border-white/[0.06] bg-black/30">
                  {sim.log.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start gap-2.5 border-b border-white/[0.04] px-3 py-2.5 last:border-b-0"
                    >
                      <span className="mt-0.5 w-4 shrink-0 text-right font-mono text-[10px] text-zinc-600">
                        {entry.txIndex}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-zinc-300">{entry.amountSol} SOL</span>
                          <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                            entry.status === "success"
                              ? "bg-emerald-500/15 text-emerald-400"
                              : "bg-red-500/15 text-red-400"
                          }`}>
                            {entry.status}
                          </span>
                          <span className="ml-auto text-[9px] text-zinc-600">
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        {entry.signature ? (
                          <a
                            href={`https://explorer.solana.com/tx/${entry.signature}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center gap-1 font-mono text-[10px] text-teal-400/80 transition-colors hover:text-teal-300"
                          >
                            {shortenSig(entry.signature)}
                            <ExternalLink size={10} />
                          </a>
                        ) : entry.error ? (
                          <p className="mt-1 truncate text-[10px] text-red-400/70">
                            {entry.error.length > 120 ? `${entry.error.slice(0, 120)}...` : entry.error}
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

        {/* Footer — close button always visible */}
        <div className="shrink-0 border-t border-white/[0.06] px-5 py-3">
          <button
            type="button"
            onClick={closePanel}
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] py-2 text-[12px] font-medium text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
          >
            {sim.isRunning ? "Stop & Close" : "Close Panel"}
          </button>
        </div>
      </div>
    </>
  );
}
