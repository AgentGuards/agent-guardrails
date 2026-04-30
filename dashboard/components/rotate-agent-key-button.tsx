"use client";

import { useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";
import { Keypair, PublicKey } from "@solana/web3.js";
import { getErrorMessage } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { GuardrailsClient } from "@/lib/sdk/client";
import { getProgramId, useAnchorProvider } from "@/components/providers";
import type { PolicySummary } from "@/lib/types/dashboard";

function secretKeyBase64(kp: Keypair): string {
  return Buffer.from(JSON.stringify(Array.from(kp.secretKey))).toString("base64");
}

export function RotateAgentKeyButton({ policy }: { policy: PolicySummary }) {
  const { publicKey } = useWallet();
  const provider = useAnchorProvider();
  const programId = getProgramId();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [showModal, setShowModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newKeypair, setNewKeypair] = useState<Keypair | null>(null);
  const [backedUp, setBackedUp] = useState(false);

  const isOwner = Boolean(publicKey && publicKey.toBase58() === policy.owner);
  const walletReady = Boolean(provider && programId);

  if (!isOwner) return null;

  const onClickRotate = () => {
    const keypair = Keypair.generate();
    setNewKeypair(keypair);
    setShowModal(true);
    setBackedUp(false);
    setError(null);
  };

  const onCancel = () => {
    setShowModal(false);
    setNewKeypair(null);
    setError(null);
  };

  const onConfirm = async () => {
    if (!newKeypair || !provider || !programId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const client = new GuardrailsClient(provider, programId);
      const { newPolicyPda } = await client.rotateAgentKey(
        new PublicKey(policy.pubkey),
        newKeypair.publicKey,
      );
      queryClient.removeQueries({ queryKey: queryKeys.policy(policy.pubkey) });
      queryClient.invalidateQueries({ queryKey: queryKeys.policies() });
      router.push(`/agents/${newPolicyPda.toBase58()}`);
    } catch (e) {
      // "Already processed" means the first click succeeded — treat as success
      const msg = getErrorMessage(e).toLowerCase();
      if (msg.includes("already been processed") || msg.includes("already processed")) {
        queryClient.removeQueries({ queryKey: queryKeys.policy(policy.pubkey) });
        queryClient.invalidateQueries({ queryKey: queryKeys.policies() });
        // Derive the new PDA to redirect
        const client = new GuardrailsClient(provider, programId);
        const [newPda] = client.findPolicyPda(new PublicKey(policy.owner), newKeypair.publicKey);
        router.push(`/agents/${newPda.toBase58()}`);
      } else {
        setError(getErrorMessage(e));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4">
      {policy.isActive ? (
        <button
          type="button"
          className="button button-secondary rounded-md px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!walletReady || busy}
          title={!walletReady ? "Connect owner wallet" : undefined}
          onClick={onClickRotate}
        >
          Rotate Agent Key
        </button>
      ) : null}

      {showModal && newKeypair ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="panel-glow max-w-lg p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-zinc-100">Rotate Agent Key</h2>

            <p className="mt-2 text-sm text-zinc-400">
              This will generate a new agent session keypair. The old key stops
              working immediately. Spend counters will reset. Operational SOL
              transfers to the new policy.
            </p>

            <div className="mt-4">
              <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                New agent public key
              </label>
              <p className="mt-1 break-all font-mono text-xs text-zinc-200">
                {newKeypair.publicKey.toBase58()}
              </p>
            </div>

            <div className="mt-4">
              <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                New agent secret key (base64)
              </label>
              <textarea
                readOnly
                className="mt-1 h-24 w-full resize-none rounded-lg border border-zinc-700 bg-zinc-950/90 px-3 py-2 font-mono text-xs text-zinc-200 outline-none"
                value={secretKeyBase64(newKeypair)}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="button button-secondary px-3 py-1.5 text-sm font-medium"
                  onClick={() => navigator.clipboard.writeText(secretKeyBase64(newKeypair))}
                >
                  Copy secret
                </button>
              </div>
            </div>

            <label className="mt-4 flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-blue-500 focus:ring-blue-500/50"
                checked={backedUp}
                disabled={busy}
                onChange={(e) => setBackedUp(e.target.checked)}
              />
              I have saved the new agent secret key
            </label>

            {error ? (
              <div className="mt-3 rounded-md border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-300">
                {error}
              </div>
            ) : null}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="button button-secondary px-4 py-2.5 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                disabled={busy}
                onClick={onCancel}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md border border-red-700 bg-red-800 px-4 py-2.5 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!backedUp || busy}
                onClick={() => void onConfirm()}
              >
                {busy ? "Signing..." : "Confirm rotation"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
