"use client";

import { useCallback, useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { useWallet } from "@solana/wallet-adapter-react";
import { Keypair } from "@solana/web3.js";
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

export function CreatePolicyWizard() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const provider = useAnchorProvider();
  const programId = getProgramId();

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
        router.push("/agents");
      } catch (e) {
        publishError(getErrorMessage(e));
      } finally {
        setSubmitting(false);
      }
    },
    [programId, provider, publicKey, publishError, resetWizard, router],
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

      <nav aria-label="Wizard steps" className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {WIZARD_STEP_LABELS.map((label, index) => {
          const active = index === currentStep;
          const done = index < currentStep;
          return (
            <div
              key={label}
              className={`rounded-md border px-3 py-2 text-sm ${
                active
                  ? "border-blue-600 bg-blue-950/40 text-blue-200"
                  : done
                    ? "border-blue-900/60 text-blue-200/80"
                    : "border-zinc-800 text-zinc-500"
              }`}
            >
              {index + 1}. {label}
            </div>
          );
        })}
      </nav>

      {submitError ? (
        <div className="rounded-md border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          {submitError}
        </div>
      ) : null}

      <div className="panel-glow p-5 md:p-6">
        <WizardStepPanels />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <button
          type="button"
          className="text-sm text-zinc-500 underline decoration-zinc-600 hover:text-zinc-300"
          onClick={() => resetWizard()}
        >
          Reset draft
        </button>
        <div className="flex flex-wrap gap-2">
          {currentStep > 0 ? (
            <button
              type="button"
              className="button button-secondary px-4 py-2.5 font-semibold"
              onClick={() => goBack()}
            >
              Back
            </button>
          ) : null}
          {currentStep < 3 ? (
            <button
              type="button"
              className="button button-primary px-4 py-2.5 font-semibold"
              onClick={() => goNext()}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              disabled={!walletReady || submitting}
              className="button button-primary px-4 py-2.5 font-semibold"
              onClick={onCreateClick}
            >
              {submitting ? "Creating…" : "Create policy"}
            </button>
          )}
        </div>
      </div>

      {canSubmitStep && !walletReady ? (
        <p className="text-sm text-zinc-500">Connect a wallet to submit this policy on-chain.</p>
      ) : null}
    </div>
  );
}
