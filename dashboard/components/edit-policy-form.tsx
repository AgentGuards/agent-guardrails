"use client";

import { BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { GuardrailsClient } from "@/lib/sdk/client";
import type { UpdatePolicyArgs } from "@/lib/sdk/types";
import { fetchPolicy } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { PROGRAM_LABELS } from "@/lib/mock";
import { lamportsToSol } from "@/lib/utils";
import {
  parseAllowedProgramAddresses,
  solToLamportsString,
  validateSessionDays,
  validateSolLimits,
} from "@/lib/policy/wizard-validation";
import { SESSION_DAYS_MAX, SESSION_DAYS_MIN } from "@/lib/policy/constants";
import { getProgramId, useAnchorProvider } from "@/components/providers";
import { useAppToast } from "@/components/toast-context";

export function EditPolicyForm({ policyPubkey }: { policyPubkey: string }) {
  const router = useRouter();
  const { publicKey } = useWallet();
  const provider = useAnchorProvider();
  const programId = getProgramId();
  const queryClient = useQueryClient();
  const toast = useAppToast();

  const { data: policy, isLoading } = useQuery({
    queryKey: queryKeys.policyByPubkey(policyPubkey),
    queryFn: () => fetchPolicy(policyPubkey),
  });

  const walletPk = publicKey?.toBase58() ?? null;
  const isOwner = policy && walletPk !== null && walletPk === policy.owner;

  const [programs, setPrograms] = useState<string[]>([]);
  const [customProgram, setCustomProgram] = useState("");
  const [maxTxSol, setMaxTxSol] = useState(5);
  const [dailyBudgetSol, setDailyBudgetSol] = useState(50);
  const [sessionDays, setSessionDays] = useState(30);
  const [useSquads, setUseSquads] = useState(false);
  const [squadsAddress, setSquadsAddress] = useState("");
  const [escalationThresholdSol, setEscalationThresholdSol] = useState(2);
  const [hydrated, setHydrated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!policy || hydrated) return;
    setPrograms(
      policy.allowedPrograms.length > 0 ? [...policy.allowedPrograms] : [SystemProgram.programId.toBase58()],
    );
    setMaxTxSol(lamportsToSol(policy.maxTxLamports));
    setDailyBudgetSol(lamportsToSol(policy.dailyBudgetLamports));
    const daysLeft = Math.ceil(
      (new Date(policy.sessionExpiry).getTime() - Date.now()) / 86_400_000,
    );
    setSessionDays(Math.min(SESSION_DAYS_MAX, Math.max(SESSION_DAYS_MIN, daysLeft || SESSION_DAYS_MIN)));
    const hasSquads = Boolean(policy.squadsMultisig);
    setUseSquads(hasSquads);
    setSquadsAddress(policy.squadsMultisig ?? "");
    setEscalationThresholdSol(
      policy.escalationThreshold ? lamportsToSol(policy.escalationThreshold) : 2,
    );
    setHydrated(true);
  }, [policy, hydrated]);

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
      setFormError(null);
    } catch {
      setFormError("Invalid program address.");
    }
  }, [customProgram]);

  const client = useMemo(() => {
    if (!provider || !programId) return null;
    return new GuardrailsClient(provider, programId);
  }, [provider, programId]);

  const handleSave = useCallback(async () => {
    setFormError(null);
    if (!policy || !isOwner || !client) {
      setFormError("You must be the policy owner with a connected wallet.");
      return;
    }
    const parsed = parseAllowedProgramAddresses(programs);
    if (!parsed.ok) {
      setFormError(parsed.message);
      return;
    }
    const limErr = validateSolLimits(maxTxSol, dailyBudgetSol);
    if (limErr) {
      setFormError(limErr);
      return;
    }
    const sessErr = validateSessionDays(sessionDays);
    if (sessErr) {
      setFormError(sessErr);
      return;
    }

    let squadsMultisigField: PublicKey;
    let escalationThreshold: BN;

    if (useSquads) {
      try {
        squadsMultisigField = new PublicKey(squadsAddress.trim());
      } catch {
        setFormError("Invalid Squads multisig address.");
        return;
      }
      if (!Number.isFinite(escalationThresholdSol) || escalationThresholdSol <= 0) {
        setFormError("Escalation threshold must be positive when Squads is enabled.");
        return;
      }
      try {
        escalationThreshold = new BN(solToLamportsString(escalationThresholdSol));
      } catch {
        setFormError("Invalid escalation threshold.");
        return;
      }
    } else {
      squadsMultisigField = PublicKey.default;
      escalationThreshold = new BN(0);
    }

    const sessionExpirySec = Math.floor(Date.now() / 1000) + sessionDays * 86400;

    const args: UpdatePolicyArgs = {
      allowedPrograms: parsed.programs,
      maxTxLamports: new BN(solToLamportsString(maxTxSol)),
      maxTxTokenUnits: null,
      dailyBudgetLamports: new BN(solToLamportsString(dailyBudgetSol)),
      sessionExpiry: new BN(sessionExpirySec),
      squadsMultisig: squadsMultisigField,
      escalationThreshold,
      authorizedMonitors: null,
      anomalyScore: null,
    };

    setSubmitting(true);
    try {
      await client.updatePolicyWithWallet(new PublicKey(policyPubkey), args);
      await queryClient.invalidateQueries({ queryKey: queryKeys.policyByPubkey(policyPubkey) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.policies() });
      toast.show("Policy updated.", "success");
      router.push(`/agents/${policyPubkey}`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Update failed.";
      toast.show(message, "error");
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  }, [
    policy,
    isOwner,
    client,
    programs,
    maxTxSol,
    dailyBudgetSol,
    sessionDays,
    useSquads,
    squadsAddress,
    escalationThresholdSol,
    policyPubkey,
    queryClient,
    router,
    toast,
  ]);

  if (isLoading || !policy) {
    return <div className="card empty">Loading policy…</div>;
  }

  if (!isOwner) {
    return (
      <div className="card empty">
        Only the policy owner can edit this agent. Connect wallet <span className="mono">{policy.owner}</span>.
      </div>
    );
  }

  if (!client) {
    return (
      <div className="card empty">
        Connect a wallet and set <span className="mono">NEXT_PUBLIC_GUARDRAILS_PROGRAM_ID</span> to submit updates.
      </div>
    );
  }

  return (
    <div className="card" style={{ display: "grid", gap: 18 }}>
      <div className="card-title">Allowed programs</div>
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

      <div className="card-title" style={{ marginTop: 8 }}>
        Limits (SOL)
      </div>
      <div style={{ display: "grid", gap: 12, maxWidth: 400 }}>
        <label>
          <div className="muted">Max per transaction</div>
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
          <div className="muted">Daily budget</div>
          <input
            className="input"
            type="number"
            min={0}
            step={0.1}
            value={dailyBudgetSol}
            onChange={(e) => setDailyBudgetSol(Number(e.target.value))}
          />
        </label>
      </div>

      <div className="card-title">Session</div>
      <label style={{ maxWidth: 400 }}>
        <div className="muted">Length from now (days, {SESSION_DAYS_MIN}–{SESSION_DAYS_MAX})</div>
        <input
          className="input"
          type="number"
          min={SESSION_DAYS_MIN}
          max={SESSION_DAYS_MAX}
          value={sessionDays}
          onChange={(e) => setSessionDays(Number(e.target.value))}
        />
      </label>

      <div className="card-title">Escalation</div>
      <label className="spread" style={{ cursor: "pointer", justifyContent: "flex-start", gap: 8 }}>
        <input type="checkbox" checked={useSquads} onChange={(e) => setUseSquads(e.target.checked)} />
        <span>Squads multisig escalation</span>
      </label>
      {useSquads ? (
        <div style={{ display: "grid", gap: 12, maxWidth: 480 }}>
          <label>
            <div className="muted">Multisig address</div>
            <input
              className="input mono"
              value={squadsAddress}
              onChange={(e) => setSquadsAddress(e.target.value)}
            />
          </label>
          <label>
            <div className="muted">Threshold (SOL)</div>
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
      ) : null}

      {formError ? <div style={{ color: "#ff6b6b" }}>{formError}</div> : null}

      <div className="spread">
        <button className="button button-secondary" type="button" onClick={() => router.push(`/agents/${policyPubkey}`)}>
          Cancel
        </button>
        <button className="button button-primary" type="button" disabled={submitting} onClick={handleSave}>
          {submitting ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
