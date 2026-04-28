"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
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
      queryClient.invalidateQueries({ queryKey: queryKeys.policies() });

      setOpen(false);
      router.push("/agents");
    } catch (e) {
      const msg = getErrorMessage(e).toLowerCase();
      if (msg.includes("already been processed") || msg.includes("already processed")) {
        queryClient.removeQueries({ queryKey: queryKeys.policy(policy.pubkey) });
        queryClient.invalidateQueries({ queryKey: queryKeys.policies() });
        router.push("/agents");
      } else {
        setError(getErrorMessage(e));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-2">
      <button
        type="button"
        className="rounded-md border border-red-900/60 bg-red-950/30 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-950/50 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!walletReady || busy}
        onClick={() => { setOpen(true); setError(null); }}
      >
        Close Policy
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="panel-glow max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-red-200">Close this policy?</h2>
            <p className="mt-2 text-sm text-zinc-400">
              This permanently closes the policy and its spend tracker on-chain.
              All SOL (rent + operational funds) will be returned to your wallet.
              Historical data will be deleted from the server.
            </p>
            <p className="mt-2 text-sm font-medium text-red-300">
              This action cannot be undone.
            </p>

            {error ? (
              <div className="mt-3 rounded-md border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-300">
                {error}
              </div>
            ) : null}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="button button-secondary"
                disabled={busy}
                onClick={() => { setOpen(false); setError(null); }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={busy}
                onClick={() => void onClose()}
              >
                {busy ? "Closing..." : "Close & Refund SOL"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
