"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { GuardrailsClient } from "@/lib/sdk/client";
import { getProgramId, useAnchorProvider } from "@/components/providers";
import type { PolicySummary } from "@/lib/types/dashboard";

const REASON_MAX = 64;

export function KillSwitchButton({ policy }: { policy: PolicySummary }) {
  const { publicKey } = useWallet();
  const provider = useAnchorProvider();
  const programId = getProgramId();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwner = Boolean(publicKey && publicKey.toBase58() === policy.owner);
  const walletReady = Boolean(provider && programId);

  if (!isOwner) return null;

  const trimmedReason = reason.trim();
  const reasonByteLength = new TextEncoder().encode(trimmedReason).length;
  const reasonOk = reasonByteLength > 0 && reasonByteLength <= REASON_MAX;

  const updateCache = (isActive: boolean) => {
    const now = new Date().toISOString();
    queryClient.setQueryData(queryKeys.policy(policy.pubkey), (prev: PolicySummary | undefined) =>
      prev ? { ...prev, isActive, updatedAt: now } : prev,
    );
    queryClient.setQueriesData<PolicySummary[]>({ queryKey: ["policies"] }, (old: PolicySummary[] | undefined) => {
      if (!old) return old;
      return old.map((row) =>
        row.pubkey === policy.pubkey ? { ...row, isActive, updatedAt: now } : row,
      );
    });
  };

  /** Check if the error actually confirms the desired state. */
  const isAlreadyInState = (e: unknown, desiredPaused: boolean) => {
    const msg = getErrorMessage(e).toLowerCase();
    if (msg.includes("already been processed") || msg.includes("already processed")) return true;
    // PolicyPaused error on pause attempt = already paused = success
    if (desiredPaused && (msg.includes("policypaused") || msg.includes("policy is paused"))) return true;
    // PolicyNotPaused error on resume attempt = already active = success
    if (!desiredPaused && (msg.includes("policynotpaused") || msg.includes("policy is not paused"))) return true;
    return false;
  };

  const onPause = async () => {
    if (!reasonOk || !provider || !programId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const client = new GuardrailsClient(provider, programId);
      await client.pauseAgent(new PublicKey(policy.pubkey), trimmedReason);
      updateCache(false);
      toast.success("Agent paused on-chain.");
      setOpen(false);
      setReason("");
    } catch (e) {
      if (isAlreadyInState(e, true)) {
        updateCache(false);
        toast.success("Agent is paused on-chain.");
        setOpen(false);
        setReason("");
      } else {
        const message = getErrorMessage(e);
        setError(message);
        toast.error(message);
      }
    } finally {
      setBusy(false);
    }
  };

  const onResume = async () => {
    if (!provider || !programId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const client = new GuardrailsClient(provider, programId);
      await client.resumeAgent(new PublicKey(policy.pubkey));
      updateCache(true);
      toast.success("Agent resumed on-chain.");
    } catch (e) {
      if (isAlreadyInState(e, false)) {
        updateCache(true);
        toast.success("Agent is active on-chain.");
      } else {
        const message = getErrorMessage(e);
        setError(message);
        toast.error(message);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {policy.isActive ? (
        <button
          type="button"
          className="rounded-md border border-red-800 bg-red-950/40 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-950/70 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!walletReady || busy}
          title={!walletReady ? "Connect owner wallet" : undefined}
          onClick={() => {
            setOpen(true);
            setError(null);
          }}
        >
          Pause agent (kill switch)
        </button>
      ) : (
        <button
          type="button"
          className="rounded-md border border-emerald-800 bg-emerald-950/40 px-4 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-950/70 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!walletReady || busy}
          title={!walletReady ? "Connect owner wallet" : undefined}
          onClick={() => void onResume()}
        >
          {busy ? "Signing..." : "Resume agent"}
        </button>
      )}

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) { setOpen(false); setReason(""); setError(null); } }}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950 shadow-[0_24px_80px_-16px_rgba(0,0,0,0.9)]"
            role="dialog"
            aria-label="Pause agent"
          >
            {/* Red accent bar */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />

            {/* Header with icon */}
            <div className="flex items-start gap-4 px-6 pt-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-[16px] font-semibold text-zinc-100">Pause this agent?</h2>
                <p className="mt-1 text-[13px] leading-relaxed text-zinc-400">
                  This immediately stops all guarded transactions. Only the policy owner can resume later.
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 pt-5 pb-2">
              {/* Agent identifier */}
              <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5">
                <span className="h-2 w-2 shrink-0 rounded-full bg-teal-500 shadow-[0_0_6px_rgba(0,255,209,0.4)]" />
                <span className="text-[13px] font-medium text-zinc-200">{policy.label ?? "Agent"}</span>
                <span className="ml-auto font-mono text-[10px] text-zinc-500">
                  {policy.pubkey.slice(0, 4)}...{policy.pubkey.slice(-4)}
                </span>
              </div>

              {/* Reason input */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="pause-reason" className="text-[12px] font-medium text-zinc-400">
                    Reason <span className="text-red-400">*</span>
                  </label>
                  <span className={`font-mono text-[10px] ${reasonByteLength > REASON_MAX ? "text-red-400" : "text-zinc-600"}`}>
                    {reasonByteLength}/{REASON_MAX}
                  </span>
                </div>
                <textarea
                  id="pause-reason"
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-3 text-[13px] text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-red-500/30 focus:ring-1 focus:ring-red-500/20"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Describe why this agent is being paused..."
                  autoFocus
                />
              </div>

              {/* Error */}
              {error && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3 py-2.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0 text-red-400">
                    <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
                  </svg>
                  <p className="text-[12px] leading-relaxed text-red-300">{error}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 border-t border-white/[0.06] px-6 py-4">
              <button
                type="button"
                disabled={busy}
                onClick={() => { setOpen(false); setReason(""); setError(null); }}
                className="rounded-lg border border-white/[0.08] bg-transparent px-4 py-2 text-[13px] font-medium text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-zinc-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!reasonOk || busy}
                onClick={() => void onPause()}
                className="rounded-lg border border-red-500/30 bg-red-600 px-4 py-2 text-[13px] font-semibold text-white shadow-[0_0_12px_rgba(239,68,68,0.2)] transition-all hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Signing...
                  </span>
                ) : "Confirm Pause"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
