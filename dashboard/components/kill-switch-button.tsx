"use client";

import { PublicKey } from "@solana/web3.js";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { GuardrailsClient } from "@/lib/sdk/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { PolicySummary } from "@/lib/types/dashboard";
import { getProgramId, useAnchorProvider } from "@/components/providers";
import { useAppToast } from "@/components/toast-context";
import { truncatePauseReason, validatePauseReason } from "@/lib/policy/wizard-validation";

export function KillSwitchButton({
  policy,
}: {
  policy: PolicySummary;
}) {
  const { publicKey } = useWallet();
  const provider = useAnchorProvider();
  const programId = getProgramId();
  const queryClient = useQueryClient();
  const toast = useAppToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const walletPk = publicKey?.toBase58() ?? null;
  const isOwner = walletPk !== null && walletPk === policy.owner;

  const patchCaches = useCallback(() => {
    const pubkey = policy.pubkey;
    queryClient.setQueryData<PolicySummary>(queryKeys.policyByPubkey(pubkey), (old) =>
      old ? { ...old, isActive: false } : old,
    );
    queryClient.setQueryData<PolicySummary[]>(queryKeys.policies(), (old) => {
      if (!old) return old;
      return old.map((p) => (p.pubkey === pubkey ? { ...p, isActive: false } : p));
    });
  }, [policy.pubkey, queryClient]);

  const confirmPause = useCallback(async () => {
    setLocalError(null);
    const v = validatePauseReason(reason);
    if (v) {
      setLocalError(v);
      return;
    }
    if (!provider || !programId) {
      setLocalError("Wallet or program ID not available.");
      return;
    }

    const client = new GuardrailsClient(provider, programId);
    const policyPda = new PublicKey(policy.pubkey);
    const reasonBuf = Buffer.from(truncatePauseReason(reason.trim()), "utf8");

    setBusy(true);
    try {
      await client.pauseAgentWithWallet(policyPda, reasonBuf);
      patchCaches();
      toast.show("Agent paused.", "success");
      setOpen(false);
      setReason("");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Pause failed.";
      toast.show(message, "error");
      setLocalError(message);
    } finally {
      setBusy(false);
    }
  }, [provider, programId, policy.pubkey, reason, patchCaches, toast]);

  if (!policy.isActive) {
    return null;
  }

  if (!isOwner) {
    return (
      <button
        className="button button-secondary"
        type="button"
        disabled
        title={walletPk ? "Only the policy owner wallet can pause this agent." : "Connect the owner wallet to pause."}
      >
        Pause agent
      </button>
    );
  }

  return (
    <>
      <button className="button" type="button" style={{ borderColor: "#ff6b6b", color: "#ff6b6b" }} onClick={() => setOpen(true)}>
        Pause agent
      </button>
      {open ? (
        <div
          className="modal-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 8000,
            padding: 16,
          }}
          role="presentation"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pause-title"
            style={{ maxWidth: 440, width: "100%", display: "grid", gap: 12 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div id="pause-title" className="card-title">
              Pause {policy.label ?? "agent"}?
            </div>
            <p className="muted" style={{ margin: 0 }}>
              This stops guarded execution immediately. You can describe why for your records (required).
            </p>
            <label>
              <div className="muted" style={{ fontSize: 13 }}>
                Reason (max 64 bytes UTF-8)
              </div>
              <textarea
                className="input"
                style={{ minHeight: 80, width: "100%" }}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Manual pause for policy review"
                maxLength={256}
              />
            </label>
            {localError ? <div style={{ color: "#ff6b6b", fontSize: 14 }}>{localError}</div> : null}
            <div className="spread">
              <button className="button button-secondary" type="button" disabled={busy} onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="button button-primary" type="button" disabled={busy} onClick={confirmPause}>
                {busy ? "Signing…" : "Confirm pause"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
