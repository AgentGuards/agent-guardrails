"use client";

import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api/client";
import type { PolicySummary } from "@/lib/types/dashboard";

export function FundAgentButton({ policy }: { policy: PolicySummary }) {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("0.05");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const isOwner = Boolean(publicKey && publicKey.toBase58() === policy.owner);
  if (!isOwner) return null;

  const parsedAmount = Number.parseFloat(amount);
  const amountOk = Number.isFinite(parsedAmount) && parsedAmount > 0;

  const onFund = async () => {
    if (!amountOk || !publicKey || busy) return;
    setBusy(true);
    setError(null);
    setBanner(null);
    try {
      const lamports = Math.round(parsedAmount * LAMPORTS_PER_SOL);
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(policy.pubkey),
          lamports,
        }),
      );
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");
      setBanner(`Funded ${parsedAmount} SOL to policy PDA.`);
      toast.success(`Funded ${parsedAmount} SOL.`);
      setOpen(false);
    } catch (e) {
      const msg = getErrorMessage(e).toLowerCase();
      if (msg.includes("already been processed") || msg.includes("already processed")) {
        setBanner(`Funded ${parsedAmount} SOL to policy PDA.`);
        toast.success(`Funding transaction already processed (${parsedAmount} SOL).`);
        setOpen(false);
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
      {banner ? (
        <div className="mb-3 rounded-md border border-emerald-900/50 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">
          {banner}
        </div>
      ) : null}

      <button
        type="button"
        className="button button-secondary rounded-md px-4 py-2 text-sm font-medium"
        disabled={busy}
        onClick={() => {
          setOpen(true);
          setError(null);
          setBanner(null);
        }}
      >
        Fund Agent
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="panel-glow max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-zinc-100">Fund Agent Policy</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Send SOL from your wallet to the policy PDA. The agent uses these
              funds for guarded transactions.
            </p>
            <p className="mt-2 font-mono text-xs text-zinc-500">
              PDA: {policy.pubkey}
            </p>

            <label className="mt-4 flex flex-col gap-1 text-sm text-zinc-400">
              Amount (SOL)
              <input
                type="number"
                min="0"
                step="0.01"
                className="rounded-lg border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-zinc-100 outline-none transition-all duration-200 focus:border-blue-700/60 focus:ring-1 focus:ring-blue-500/30"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>

            {error ? (
              <div className="mt-2 rounded-md border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-300">
                {error}
              </div>
            ) : null}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="button button-secondary"
                disabled={busy}
                onClick={() => {
                  setOpen(false);
                  setError(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button button-primary"
                disabled={!amountOk || busy}
                onClick={() => void onFund()}
              >
                {busy ? "Sending..." : `Send ${amountOk ? parsedAmount : 0} SOL`}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
