"use client";

import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api/client";
import type { PolicySummary } from "@/lib/types/dashboard";

type FundMode = "sol" | "token";

const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

function findATA(wallet: PublicKey, mint: PublicKey): PublicKey {
  const [ata] = PublicKey.findProgramAddressSync(
    [wallet.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  return ata;
}

function createATAInstruction(payer: PublicKey, ata: PublicKey, owner: PublicKey, mint: PublicKey): TransactionInstruction {
  return new TransactionInstruction({
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: ata, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: Buffer.alloc(0),
  });
}

function createTokenTransferInstruction(source: PublicKey, dest: PublicKey, owner: PublicKey, amount: bigint): TransactionInstruction {
  const data = Buffer.alloc(9);
  data.writeUInt8(3, 0); // Transfer instruction index
  data.writeBigUInt64LE(amount, 1);
  return new TransactionInstruction({
    programId: TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: source, isSigner: false, isWritable: true },
      { pubkey: dest, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    data,
  });
}

export function FundAgentButton({ policy }: { policy: PolicySummary }) {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<FundMode>("sol");
  const [amount, setAmount] = useState("0.05");
  const [mintAddress, setMintAddress] = useState("");
  const [decimals, setDecimals] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const isOwner = Boolean(publicKey && publicKey.toBase58() === policy.owner);
  if (!isOwner) return null;

  const parsedAmount = Number.parseFloat(amount);
  const amountOk = Number.isFinite(parsedAmount) && parsedAmount > 0;

  let mintValid = false;
  try { if (mintAddress.trim()) { new PublicKey(mintAddress.trim()); mintValid = true; } } catch { /* invalid */ }

  const tokenReady = mode === "token" && mintValid && amountOk;
  const solReady = mode === "sol" && amountOk;

  const onLookupMint = async (addr: string) => {
    setMintAddress(addr);
    setDecimals(null);
    try {
      const pk = new PublicKey(addr.trim());
      const info = await connection.getParsedAccountInfo(pk);
      const parsed = (info.value?.data as { parsed?: { info?: { decimals?: number } } } | null)?.parsed;
      if (parsed?.info?.decimals != null) setDecimals(parsed.info.decimals);
    } catch { /* ignore */ }
  };

  const onFundSol = async () => {
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
        setOpen(false);
      } else {
        setError(getErrorMessage(e));
      }
    } finally {
      setBusy(false);
    }
  };

  const onFundToken = async () => {
    if (!tokenReady || !publicKey || busy || decimals == null) return;
    setBusy(true);
    setError(null);
    setBanner(null);
    try {
      const mint = new PublicKey(mintAddress.trim());
      const policyPda = new PublicKey(policy.pubkey);
      const sourceAta = findATA(publicKey, mint);
      const destAta = findATA(policyPda, mint);
      const rawAmount = BigInt(Math.round(parsedAmount * 10 ** decimals));

      const tx = new Transaction();

      // Create destination ATA if it doesn't exist
      const destInfo = await connection.getAccountInfo(destAta);
      if (!destInfo) {
        tx.add(createATAInstruction(publicKey, destAta, policyPda, mint));
      }

      tx.add(createTokenTransferInstruction(sourceAta, destAta, publicKey, rawAmount));

      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");
      setBanner(`Funded ${parsedAmount} tokens to policy PDA.`);
      toast.success(`Funded ${parsedAmount} tokens.`);
      setOpen(false);
    } catch (e) {
      const msg = getErrorMessage(e).toLowerCase();
      if (msg.includes("already been processed")) {
        setBanner(`Token transfer already processed.`);
        setOpen(false);
      } else {
        setError(getErrorMessage(e));
      }
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = mode === "sol" ? solReady : tokenReady && decimals != null;

  return (
    <>
      {banner && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-3.5 py-2.5 text-[13px] text-emerald-300">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-emerald-400"><path d="M20 6 9 17l-5-5" /></svg>
          {banner}
        </div>
      )}

      <button
        type="button"
        className="button button-secondary rounded-md px-4 py-2 text-sm font-medium"
        disabled={busy}
        onClick={() => { setOpen(true); setError(null); setBanner(null); }}
      >
        Fund Agent
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) { setOpen(false); setError(null); } }}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950 shadow-[0_24px_80px_-16px_rgba(0,0,0,0.9)]"
            role="dialog"
            aria-label="Fund agent"
          >
            {/* Accent bar */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-teal-500/50 to-transparent" />

            {/* Header */}
            <div className="flex items-start gap-4 px-6 pt-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal-500/20 bg-teal-500/10">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-teal-400"><path d="M12 2v20M2 12h20" /></svg>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-[16px] font-semibold text-zinc-100">Fund Agent Policy</h2>
                <p className="mt-1 text-[13px] leading-relaxed text-zinc-400">
                  Send assets from your wallet to the policy PDA for guarded transactions.
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 pt-5 pb-2">

              {/* Asset type toggle */}
              <div className="mb-4 flex rounded-lg border border-white/[0.06] bg-white/[0.02] p-1">
                {(["sol", "token"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setMode(m); setError(null); }}
                    className={`flex-1 rounded-md px-3 py-2 text-[12px] font-semibold transition-all ${
                      mode === m
                        ? "bg-white/[0.08] text-zinc-100 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {m === "sol" ? "SOL" : "SPL Token"}
                  </button>
                ))}
              </div>

              {/* Destination PDA */}
              <div className="mb-4 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Destination PDA</div>
                <div className="break-all font-mono text-[11px] leading-relaxed text-zinc-400">{policy.pubkey}</div>
              </div>

              {/* Token mint input (token mode only) */}
              {mode === "token" && (
                <div className="mb-4">
                  <div className="mb-1.5 flex items-center justify-between">
                    <label htmlFor="fund-mint" className="text-[12px] font-medium text-zinc-400">Token Mint Address</label>
                    {decimals != null && (
                      <span className="rounded bg-teal-500/10 px-1.5 py-0.5 text-[10px] font-medium text-teal-400">
                        {decimals} decimals
                      </span>
                    )}
                  </div>
                  <input
                    id="fund-mint"
                    type="text"
                    className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 font-mono text-[12px] text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-teal-500/30 focus:ring-1 focus:ring-teal-500/20"
                    value={mintAddress}
                    onChange={(e) => void onLookupMint(e.target.value)}
                    placeholder="e.g. EPjFWdd5AufqSSqeM2qN1xzybapC8G4..."
                  />
                  {mintAddress && !mintValid && (
                    <p className="mt-1 text-[11px] text-red-400">Invalid public key</p>
                  )}
                  {mintValid && decimals == null && (
                    <p className="mt-1 text-[11px] text-amber-400">Looking up token info...</p>
                  )}
                </div>
              )}

              {/* Amount input */}
              <div>
                <label htmlFor="fund-amount" className="mb-1.5 block text-[12px] font-medium text-zinc-400">
                  Amount
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 transition-colors focus-within:border-teal-500/30 focus-within:ring-1 focus-within:ring-teal-500/20">
                  <input
                    id="fund-amount"
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*\.?[0-9]*"
                    className="min-w-0 flex-1 bg-transparent font-mono text-[16px] font-semibold text-zinc-100 outline-none placeholder:text-zinc-600"
                    value={amount}
                    onChange={(e) => { const v = e.target.value; if (v === "" || /^\d*\.?\d*$/.test(v)) setAmount(v); }}
                    placeholder="0.00"
                    autoFocus={mode === "sol"}
                  />
                  <span className="shrink-0 rounded-md bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-zinc-400">
                    {mode === "sol" ? "SOL" : "TOKENS"}
                  </span>
                </div>
                {/* Quick presets (SOL mode) */}
                {mode === "sol" && (
                  <div className="mt-2 flex gap-1.5">
                    {["0.01", "0.05", "0.1", "0.5"].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setAmount(v)}
                        className={`rounded-md border px-2.5 py-1 text-[10px] font-medium transition-all ${
                          amount === v
                            ? "border-teal-500/25 bg-teal-500/10 text-teal-400"
                            : "border-white/[0.06] bg-transparent text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                )}
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
                disabled={!canSubmit || busy}
                onClick={() => void (mode === "sol" ? onFundSol() : onFundToken())}
                className="rounded-lg border border-teal-500/30 bg-teal-600 px-4 py-2 text-[13px] font-semibold text-white shadow-[0_0_12px_rgba(0,255,209,0.15)] transition-all hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Sending...
                  </span>
                ) : mode === "sol"
                  ? `Send ${amountOk ? parsedAmount : 0} SOL`
                  : `Send ${amountOk ? parsedAmount : 0} Tokens`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
