"use client";

import { useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { GuardrailsClient } from "@/lib/sdk/client";
import { getProgramId, useAnchorProvider } from "@/components/providers";
import type { PolicySummary } from "@/lib/types/dashboard";

export function ClosePolicyButton({ policy }: { policy: PolicySummary }) {
  const { publicKey } = useWallet();
  const provider = useAnchorProvider();
  const programId = getProgramId();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwner = Boolean(publicKey && publicKey.toBase58() === policy.owner);
  const walletReady = Boolean(provider && programId);

  if (!isOwner) return null;
  // Only show when policy is paused
  if (policy.isActive) return null;

  const onClose = async () => {
    if (!provider || !programId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const client = new GuardrailsClient(provider, programId);
      await client.closePolicy(new PublicKey(policy.pubkey));

      queryClient.removeQueries({ queryKey: queryKeys.policy(policy.pubkey) });
      queryClient.invalidateQueries({ queryKey: ["policies"] });

      setOpen(false);
      toast.success("Policy closed and refunded.");
      router.push("/agents");
    } catch (e) {
      const msg = getErrorMessage(e).toLowerCase();
      if (msg.includes("already been processed") || msg.includes("already processed")) {
        queryClient.removeQueries({ queryKey: queryKeys.policy(policy.pubkey) });
        queryClient.invalidateQueries({ queryKey: ["policies"] });
        toast.success("Policy close was already processed.");
        router.push("/agents");
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
      <button
        type="button"
        className="rounded-md border border-red-900/60 bg-red-950/30 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-950/50 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!walletReady || busy}
        onClick={() => { setOpen(true); setError(null); }}
      >
        Close Policy
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget && !busy) { setOpen(false); setError(null); } }}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950 shadow-[0_24px_80px_-16px_rgba(0,0,0,0.9)]"
            role="dialog"
            aria-label="Close policy"
          >
            {/* Red accent bar — destructive */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-red-500/60 to-transparent" />

            {/* Header */}
            <div className="flex items-start gap-4 px-6 pt-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400">
                  <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  <line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-[16px] font-semibold text-zinc-100">Close this policy?</h2>
                <p className="mt-1 text-[13px] leading-relaxed text-zinc-400">
                  This permanently closes the policy and its spend tracker on-chain.
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 pt-5 pb-2">

              {/* Agent identifier */}
              <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5">
                <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(240,160,48,0.4)]" />
                <span className="text-[13px] font-medium text-zinc-200">{policy.label ?? "Agent"}</span>
                <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">Paused</span>
                <span className="ml-auto font-mono text-[10px] text-zinc-500">
                  {policy.pubkey.slice(0, 4)}...{policy.pubkey.slice(-4)}
                </span>
              </div>

              {/* What happens */}
              <div className="mb-4 space-y-2">
                {[
                  { icon: "↩", text: "All SOL (rent + operational funds) returned to your wallet" },
                  { icon: "🗑", text: "Historical data deleted from the server" },
                  { icon: "⛓", text: "Policy and spend tracker accounts closed on-chain" },
                ].map((item) => (
                  <div key={item.text} className="flex items-start gap-2.5 text-[12px] leading-relaxed text-zinc-400">
                    <span className="mt-0.5 shrink-0 text-[11px]">{item.icon}</span>
                    {item.text}
                  </div>
                ))}
              </div>

              {/* Warning */}
              <div className="rounded-lg border border-red-500/20 bg-red-500/[0.05] px-3.5 py-3">
                <div className="flex items-start gap-2.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0 text-red-400">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" x2="12" y1="9" y2="13" /><line x1="12" x2="12.01" y1="17" y2="17" />
                  </svg>
                  <span className="text-[12px] font-medium leading-relaxed text-red-300">
                    This action cannot be undone. The agent will permanently lose access to this policy.
                  </span>
                </div>
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
                onClick={() => { setOpen(false); setError(null); }}
                className="rounded-lg border border-white/[0.08] bg-transparent px-4 py-2 text-[13px] font-medium text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-zinc-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void onClose()}
                className="rounded-lg border border-red-500/30 bg-red-600 px-4 py-2 text-[13px] font-semibold text-white shadow-[0_0_12px_rgba(239,68,68,0.2)] transition-all hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Closing...
                  </span>
                ) : "Close & Refund SOL"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
