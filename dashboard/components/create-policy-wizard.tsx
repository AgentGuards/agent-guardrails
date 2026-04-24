"use client";

import { BN } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";
import { GuardrailsClient } from "@/lib/sdk/client";
import type { InitializePolicyArgs } from "@/lib/sdk/types";
import { PROGRAM_LABELS } from "@/lib/mock";
import { queryKeys } from "@/lib/api/query-keys";
import {
  parseAllowedProgramAddresses,
  solToLamportsString,
  validateSessionDays,
  validateSolLimits,
} from "@/lib/policy/wizard-validation";
import { getProgramId, useAnchorProvider } from "@/components/providers";
import { useAppToast } from "@/components/toast-context";

const STEPS = ["Programs", "Limits", "Session", "Escalation"] as const;

export function CreatePolicyWizard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const provider = useAnchorProvider();
  const programId = getProgramId();
  const toast = useAppToast();
  const agentKeypairRef = useRef<Keypair | null>(null);
  if (!agentKeypairRef.current) {
    agentKeypairRef.current = Keypair.generate();
  }

  const client = useMemo(() => {
    if (!provider || !programId) return null;
    return new GuardrailsClient(provider, programId);
  }, [provider, programId]);

  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [programs, setPrograms] = useState<string[]>([SystemProgram.programId.toBase58()]);
  const [customProgram, setCustomProgram] = useState("");

  const [maxTxSol, setMaxTxSol] = useState(5);
  const [dailyBudgetSol, setDailyBudgetSol] = useState(50);

  const [sessionDays, setSessionDays] = useState(30);

  const [useSquads, setUseSquads] = useState(false);
  const [squadsAddress, setSquadsAddress] = useState("");
  const [escalationThresholdSol, setEscalationThresholdSol] = useState(2);

  const knownPrograms = useMemo(
    () =>
      Object.entries(PROGRAM_LABELS).map(([address, label]) => ({
        address,
        label,
      })),
    [],
  );

  const toggleProgram = useCallback((address: string) => {
    setPrograms((prev) =>
      prev.includes(address) ? prev.filter((a) => a !== address) : [...prev, address],
    );
  }, []);

  const addCustomProgram = useCallback(() => {
    const raw = customProgram.trim();
    if (!raw) return;
    try {
      const pk = new PublicKey(raw);
      const b58 = pk.toBase58();
      setPrograms((prev) => (prev.includes(b58) ? prev : [...prev, b58]));
      setCustomProgram("");
      setStepError(null);
    } catch {
      setStepError("Invalid program address.");
    }
  }, [customProgram]);

  const goNext = useCallback(() => {
    setStepError(null);
    if (step === 0) {
      const parsed = parseAllowedProgramAddresses(programs);
      if (!parsed.ok) {
        setStepError(parsed.message);
        return;
      }
    }
    if (step === 1) {
      const err = validateSolLimits(maxTxSol, dailyBudgetSol);
      if (err) {
        setStepError(err);
        return;
      }
    }
    if (step === 2) {
      const err = validateSessionDays(sessionDays);
      if (err) {
        setStepError(err);
        return;
      }
    }
    if (step === 3 && useSquads) {
      try {
        new PublicKey(squadsAddress.trim());
      } catch {
        setStepError("Enter a valid Squads multisig address.");
        return;
      }
      if (!Number.isFinite(escalationThresholdSol) || escalationThresholdSol <= 0) {
        setStepError("Escalation threshold must be a positive SOL amount.");
        return;
      }
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }, [
    step,
    programs,
    maxTxSol,
    dailyBudgetSol,
    sessionDays,
    useSquads,
    squadsAddress,
    escalationThresholdSol,
  ]);

  const goBack = useCallback(() => {
    setStepError(null);
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const handleSubmit = useCallback(async () => {
    setStepError(null);
    if (!client || !provider) {
      setStepError("Connect a wallet that supports Anchor transactions.");
      return;
    }
    const parsed = parseAllowedProgramAddresses(programs);
    if (!parsed.ok) {
      setStepError(parsed.message);
      return;
    }
    const limErr = validateSolLimits(maxTxSol, dailyBudgetSol);
    if (limErr) {
      setStepError(limErr);
      return;
    }
    const sessErr = validateSessionDays(sessionDays);
    if (sessErr) {
      setStepError(sessErr);
      return;
    }

    let squadsMultisig: PublicKey | null = null;
    let escalationThreshold = new BN(0);
    if (useSquads) {
      try {
        squadsMultisig = new PublicKey(squadsAddress.trim());
      } catch {
        setStepError("Invalid Squads multisig address.");
        return;
      }
      try {
        escalationThreshold = new BN(solToLamportsString(escalationThresholdSol));
      } catch {
        setStepError("Invalid escalation threshold.");
        return;
      }
    }

    const ownerPk = provider.wallet.publicKey;
    const agent = agentKeypairRef.current!;
    const [policyPda] = client.findPolicyPda(ownerPk, agent.publicKey);

    const sessionExpirySec = Math.floor(Date.now() / 1000) + sessionDays * 86400;
    const args: InitializePolicyArgs = {
      allowedPrograms: parsed.programs,
      maxTxLamports: new BN(solToLamportsString(maxTxSol)),
      maxTxTokenUnits: new BN(0),
      dailyBudgetLamports: new BN(solToLamportsString(dailyBudgetSol)),
      sessionExpiry: new BN(sessionExpirySec),
      squadsMultisig,
      escalationThreshold,
      authorizedMonitors: [],
    };

    setSubmitting(true);
    try {
      await client.initializePolicyWithWallet(agent.publicKey, args);
      await queryClient.invalidateQueries({ queryKey: queryKeys.policies() });
      toast.show("Policy created on-chain.", "success");
      router.push(`/agents/${policyPda.toBase58()}`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Failed to create policy.";
      toast.show(message, "error");
      setStepError(message);
    } finally {
      setSubmitting(false);
    }
  }, [
    client,
    provider,
    programs,
    maxTxSol,
    dailyBudgetSol,
    sessionDays,
    useSquads,
    squadsAddress,
    escalationThresholdSol,
    queryClient,
    router,
    toast,
  ]);

  const walletReady = Boolean(provider && programId);
  const agentPreview = agentKeypairRef.current!.publicKey.toBase58();

  return (
    <div className="card" style={{ display: "grid", gap: 20 }}>
      <div className="spread">
        <div className="card-title">Step {step + 1} of {STEPS.length}: {STEPS[step]}</div>
        <span className="muted mono" style={{ fontSize: 12 }}>
          Agent session: {agentPreview.slice(0, 8)}…
        </span>
      </div>

      {!walletReady ? (
        <div className="muted">
          Connect a wallet and set <span className="mono">NEXT_PUBLIC_GUARDRAILS_PROGRAM_ID</span> to create a policy on-chain.
        </div>
      ) : null}

      {step === 0 ? (
        <div style={{ display: "grid", gap: 14 }}>
          <div className="muted">Choose allowed CPI targets (max 10 total).</div>
          <div style={{ display: "grid", gap: 8 }}>
            {knownPrograms.map(({ address, label }) => (
              <label key={address} className="spread" style={{ cursor: "pointer" }}>
                <span>
                  <input
                    type="checkbox"
                    checked={programs.includes(address)}
                    onChange={() => toggleProgram(address)}
                  />{" "}
                  <span className="mono">{label}</span>
                  <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>
                    {address.slice(0, 4)}…{address.slice(-4)}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input
              className="input"
              style={{ flex: 1, minWidth: 200 }}
              placeholder="Custom program address"
              value={customProgram}
              onChange={(e) => setCustomProgram(e.target.value)}
            />
            <button className="button button-secondary" type="button" onClick={addCustomProgram}>
              Add program
            </button>
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div style={{ display: "grid", gap: 12, maxWidth: 400 }}>
          <label>
            <div className="muted">Max per transaction (SOL)</div>
            <input
              className="input"
              type="number"
              min={0}
              step={0.01}
              value={maxTxSol}
              onChange={(e) => setMaxTxSol(Number(e.target.value))}
            />
          </label>
          <label>
            <div className="muted">Daily budget (SOL)</div>
            <input
              className="input"
              type="number"
              min={0}
              step={0.1}
              value={dailyBudgetSol}
              onChange={(e) => setDailyBudgetSol(Number(e.target.value))}
            />
          </label>
          <div className="muted" style={{ fontSize: 13 }}>
            Daily budget must be greater than or equal to the per-transaction cap (on-chain rule).
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div style={{ display: "grid", gap: 12, maxWidth: 400 }}>
          <label>
            <div className="muted">Session length (days, 1–90)</div>
            <input
              className="input"
              type="number"
              min={1}
              max={90}
              value={sessionDays}
              onChange={(e) => setSessionDays(Number(e.target.value))}
            />
          </label>
          <div className="muted" style={{ fontSize: 13 }}>
            Session expiry is computed from now in UTC.
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div style={{ display: "grid", gap: 14 }}>
          <label className="spread" style={{ cursor: "pointer", justifyContent: "flex-start", gap: 8 }}>
            <input type="checkbox" checked={useSquads} onChange={(e) => setUseSquads(e.target.checked)} />
            <span>Require Squads multisig for high-value transactions</span>
          </label>
          {useSquads ? (
            <div style={{ display: "grid", gap: 12, maxWidth: 480 }}>
              <label>
                <div className="muted">Squads multisig address</div>
                <input
                  className="input mono"
                  value={squadsAddress}
                  onChange={(e) => setSquadsAddress(e.target.value)}
                  placeholder="Squads v4 multisig pubkey"
                />
              </label>
              <label>
                <div className="muted">Escalation threshold (SOL)</div>
                <input
                  className="input"
                  type="number"
                  min={0}
                  step={0.1}
                  value={escalationThresholdSol}
                  onChange={(e) => setEscalationThresholdSol(Number(e.target.value))}
                />
              </label>
            </div>
          ) : (
            <div className="muted">Escalation is off; large transactions are not routed to Squads.</div>
          )}
        </div>
      ) : null}

      {stepError ? <div style={{ color: "#ff6b6b", fontSize: 14 }}>{stepError}</div> : null}

      <div className="spread" style={{ marginTop: 8 }}>
        <button className="button button-secondary" type="button" disabled={step === 0 || submitting} onClick={goBack}>
          Back
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          {step < STEPS.length - 1 ? (
            <button className="button button-primary" type="button" onClick={goNext} disabled={!walletReady}>
              Next
            </button>
          ) : (
            <button
              className="button button-primary"
              type="button"
              disabled={!walletReady || submitting}
              onClick={handleSubmit}
            >
              {submitting ? "Signing…" : "Create policy"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
