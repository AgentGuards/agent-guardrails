"use client";

import { useState } from "react";
import type { Keypair } from "@solana/web3.js";
import { toast } from "sonner";

function secretKeyBase64(kp: Keypair): string {
  return Buffer.from(JSON.stringify(Array.from(kp.secretKey))).toString("base64");
}

export function AgentSecretBackupModal({
  agentKeypair,
  onCancel,
  onConfirm,
  busy,
}: {
  agentKeypair: Keypair;
  onCancel: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  const [saved, setSaved] = useState(false);
  const secret = secretKeyBase64(agentKeypair);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onCancel(); }}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950 shadow-[0_24px_80px_-16px_rgba(0,0,0,0.9)]"
        role="dialog"
        aria-label="Save agent secret"
      >
        {/* Amber accent bar */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

        {/* Header */}
        <div className="flex items-start gap-4 px-6 pt-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-semibold text-zinc-100">Save Your Agent Secret</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-zinc-400">
              This key signs <span className="font-mono text-zinc-300">guarded_execute</span> transactions. It cannot be recovered later.
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 pt-5 pb-2">
          {/* Public key */}
          <div className="mb-4 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Agent Public Key</div>
            <div className="break-all font-mono text-[11px] leading-relaxed text-zinc-300">
              {agentKeypair.publicKey.toBase58()}
            </div>
          </div>

          {/* Secret key */}
          <div className="mb-4">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[12px] font-medium text-zinc-400">
                Secret Key <span className="text-amber-400">(save this)</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(secret)
                    .then(() => toast.success("Secret key copied."))
                    .catch(() => toast.error("Could not copy."));
                }}
                className="inline-flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                Copy
              </button>
            </div>
            <div className="rounded-lg border border-amber-500/15 bg-amber-500/[0.03] p-3">
              <pre className="whitespace-pre-wrap break-all font-mono text-[10px] leading-relaxed text-zinc-400">
                {secret}
              </pre>
            </div>
          </div>

          {/* Backup checkbox */}
          <div className="rounded-lg border border-amber-500/15 bg-amber-500/[0.04] px-3.5 py-3">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-zinc-900 accent-amber-500"
                checked={saved}
                disabled={busy}
                onChange={(e) => setSaved(e.target.checked)}
              />
              <div>
                <span className="text-[13px] font-medium text-zinc-200">I have saved the agent secret key</span>
                <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">
                  This key cannot be recovered after closing this dialog. Without it, the agent cannot sign transactions.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-white/[0.06] px-6 py-4">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-lg border border-white/[0.08] bg-transparent px-4 py-2 text-[13px] font-medium text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-zinc-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!saved || busy}
            onClick={onConfirm}
            className="rounded-lg border border-teal-500/30 bg-teal-600 px-4 py-2 text-[13px] font-semibold text-white shadow-[0_0_12px_rgba(0,255,209,0.15)] transition-all hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <span className="flex items-center gap-2">
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Creating...
              </span>
            ) : "Sign & Create Policy"}
          </button>
        </div>
      </div>
    </div>
  );
}
