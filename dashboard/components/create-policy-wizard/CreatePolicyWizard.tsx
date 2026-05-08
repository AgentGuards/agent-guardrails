"use client";

import { useCallback, useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { useWallet } from "@solana/wallet-adapter-react";
import { Keypair } from "@solana/web3.js";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { WizardStepPanels } from "@/components/create-policy-wizard/wizard-step-panels";
import { AgentSecretBackupModal } from "@/components/create-policy-wizard/agent-secret-backup-modal";
import { getErrorMessage } from "@/lib/api/client";
import { buildInitializePolicyArgs } from "@/lib/create-policy/build-args";
import { createSquadsMultisig } from "@/lib/create-policy/create-squads-multisig";
import {
  firstErrorStepFromErrors,
  validateFullDraft,
} from "@/lib/create-policy/validate";
import { GuardrailsClient } from "@/lib/sdk/client";
import { useCreatePolicyWizardStore, WIZARD_STEP_LABELS } from "@/lib/stores/create-policy-wizard";
import { getProgramId, useAnchorProvider } from "@/components/providers";

function isIdempotentCreateError(error: unknown) {
  const msg = getErrorMessage(error).toLowerCase();
  return (
    msg.includes("already in use") ||
    msg.includes("already initialized") ||
    msg.includes("already been processed") ||
    msg.includes("already processed")
  );
}

export function CreatePolicyWizard({ onCreated }: { onCreated?: () => void }) {
  const router = useRouter();
  const { publicKey } = useWallet();
  const provider = useAnchorProvider();
  const programId = getProgramId();
  const queryClient = useQueryClient();

  const currentStep = useCreatePolicyWizardStore((s) => s.currentStep);
  const goNext = useCreatePolicyWizardStore((s) => s.goNext);
  const goBack = useCreatePolicyWizardStore((s) => s.goBack);
  const resetWizard = useCreatePolicyWizardStore((s) => s.resetWizard);
  const jumpToStep = useCreatePolicyWizardStore((s) => s.jumpToStep);

  const [agentKeypair, setAgentKeypair] = useState<Keypair | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const publishError = useCallback((message: string) => {
    setSubmitError(message);
    toast.error(message);
  }, []);

  const runCreate = useCallback(
    async (agent: Keypair) => {
      if (!provider || !publicKey || !programId) {
        setSubmitError("Connect your wallet and set the program ID in the environment.");
        return;
      }

      const state = useCreatePolicyWizardStore.getState();
      const client = new GuardrailsClient(provider, programId);

      setSubmitting(true);
      setSubmitError(null);
      try {
        // If creating a new multisig, do it first
        let multisigPdaOverride: import("@solana/web3.js").PublicKey | undefined;
        if (
          state.escalationEnabled &&
          state.multisigMode === "create" &&
          state.multisigMembers.length >= 2
        ) {
          const { multisigPda } = await createSquadsMultisig(
            provider.connection,
            provider.wallet,
            state.multisigMembers,
            state.multisigThreshold,
          );
          multisigPdaOverride = multisigPda;
        }

        const args = buildInitializePolicyArgs(state, multisigPdaOverride);

        const [policyPda] = client.findPolicyPda(publicKey, agent.publicKey);
        const pdaStr = policyPda.toBase58();
        try {
          await client.initializePolicy(agent.publicKey, args);
        } catch (e) {
          if (!isIdempotentCreateError(e)) throw e;
        }

        // Store pending label — a hook on the agents page will PATCH it
        // once the webhook creates the DB row via SSE
        const labelText = state.label.trim();
        if (labelText) {
          try {
            const pending = JSON.parse(sessionStorage.getItem("pending-labels") || "{}");
            pending[pdaStr] = labelText;
            sessionStorage.setItem("pending-labels", JSON.stringify(pending));
          } catch { /* ignore */ }
        }

        setAgentKeypair(null);
        resetWizard();
        toast.success("Policy created on-chain.");
        queryClient.invalidateQueries({ queryKey: ["policies"] });
        // Webhook → DB row can lag a few seconds; re-poll briefly so the new
        // agent shows up without a manual refresh.
        const retryDelays = [1500, 3500, 6500];
        retryDelays.forEach((delay) => {
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ["policies"] });
          }, delay);
        });
        if (onCreated) {
          onCreated();
          router.refresh();
        } else {
          router.push("/agents");
        }
      } catch (e) {
        publishError(getErrorMessage(e));
      } finally {
        setSubmitting(false);
      }
    },
    [onCreated, programId, provider, publicKey, publishError, queryClient, resetWizard, router],
  );

  const onCreateClick = () => {
    setSubmitError(null);
    const state = useCreatePolicyWizardStore.getState();
    const { ok, errors } = validateFullDraft(state);
    if (!ok) {
      jumpToStep(firstErrorStepFromErrors(errors));
      useCreatePolicyWizardStore.setState({ fieldErrors: errors });
      return;
    }
    if (!publicKey) {
      publishError("Connect your wallet to create a policy.");
      return;
    }
    if (!provider || !programId) {
      publishError("Wallet not ready or NEXT_PUBLIC_GUARDRAILS_PROGRAM_ID is missing.");
      return;
    }
    if (!agentKeypair) {
      setAgentKeypair(Keypair.generate());
      return;
    }
  };

  const onModalConfirm = () => {
    if (agentKeypair) void runCreate(agentKeypair);
  };

  const onModalCancel = () => {
    if (!submitting) setAgentKeypair(null);
  };

  const walletReady = Boolean(publicKey && provider && programId);
  const canSubmitStep = currentStep === 3;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      {agentKeypair ? (
        <AgentSecretBackupModal
          agentKeypair={agentKeypair}
          busy={submitting}
          onCancel={onModalCancel}
          onConfirm={onModalConfirm}
        />
      ) : null}

      {/* Step indicator */}
      <nav aria-label="Wizard steps" className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {WIZARD_STEP_LABELS.map((label, index) => {
          const active = index === currentStep;
          const done = index < currentStep;
          return (
            <button
              key={label}
              type="button"
              onClick={() => jumpToStep(index)}
              className={`flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-left transition-all ${
                active
                  ? "border-teal-500/25 bg-teal-500/[0.06] shadow-[0_0_12px_rgba(0,255,209,0.06)]"
                  : done
                    ? "border-teal-500/10 bg-transparent"
                    : "border-white/[0.06] bg-transparent"
              }`}
            >
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                active
                  ? "bg-teal-500 text-black"
                  : done
                    ? "bg-teal-500/20 text-teal-400"
                    : "bg-white/[0.06] text-zinc-500"
              }`}>
                {done ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg>
                ) : index + 1}
              </span>
              <span className={`text-[12px] font-medium ${active ? "text-zinc-100" : done ? "text-teal-400/80" : "text-zinc-500"}`}>
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Error banner */}
      {submitError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3.5 py-2.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0 text-red-400"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
          <p className="text-[12px] leading-relaxed text-red-300">{submitError}</p>
        </div>
      )}

      {/* Step content */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] md:p-6">
        <WizardStepPanels />
      </div>

      {/* Footer actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className="text-[12px] text-zinc-600 transition-colors hover:text-zinc-400"
          onClick={() => resetWizard()}
        >
          Reset draft
        </button>
        <div className="flex flex-wrap gap-2">
          {currentStep > 0 && (
            <button
              type="button"
              onClick={() => goBack()}
              className="rounded-lg border border-white/[0.08] bg-transparent px-4 py-2 text-[13px] font-medium text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-zinc-200"
            >
              Back
            </button>
          )}
          {currentStep < 3 ? (
            <button
              type="button"
              onClick={() => goNext()}
              className="rounded-lg border border-teal-500/30 bg-teal-600 px-5 py-2 text-[13px] font-semibold text-white shadow-[0_0_12px_rgba(0,255,209,0.15)] transition-all hover:bg-teal-500"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              disabled={!walletReady || submitting}
              onClick={onCreateClick}
              className="rounded-lg border border-teal-500/30 bg-teal-600 px-5 py-2 text-[13px] font-semibold text-white shadow-[0_0_12px_rgba(0,255,209,0.15)] transition-all hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Creating...
                </span>
              ) : "Create Policy"}
            </button>
          )}
        </div>
      </div>

      {canSubmitStep && !walletReady && (
        <p className="text-[12px] text-zinc-500">Connect a wallet to submit this policy on-chain.</p>
      )}
    </div>
  );
}
