"use client";

import { useEffect, useState } from "react";
import { PROGRAM_LABELS } from "@/lib/mock/policies";
import { isValidPubkeyString } from "@/lib/create-policy/validate";
import { useCreatePolicyWizardStore } from "@/lib/stores/create-policy-wizard";

function shortenPubkey(pubkey: string): string {
  if (pubkey.length <= 8) return pubkey;
  return `${pubkey.slice(0, 4)}…${pubkey.slice(-4)}`;
}

function useBufferedNumberInput(
  value: number,
  setValue: (nextValue: number) => void,
  parse: (raw: string) => number,
) {
  const [inputValue, setInputValue] = useState(() => (Number.isFinite(value) ? String(value) : ""));

  useEffect(() => {
    setInputValue(Number.isFinite(value) ? String(value) : "");
  }, [value]);

  const commitValue = () => {
    const trimmed = inputValue.trim();
    const parsedValue = trimmed ? parse(trimmed) : 0;
    setValue(Number.isFinite(parsedValue) ? parsedValue : 0);
  };

  return { inputValue, setInputValue, commitValue };
}

const inputClass = "w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-teal-500/30 focus:ring-1 focus:ring-teal-500/20";

export function WizardStepPanels() {
  const currentStep = useCreatePolicyWizardStore((s) => s.currentStep);
  const fieldErrors = useCreatePolicyWizardStore((s) => s.fieldErrors);

  switch (currentStep) {
    case 0:
      return <ProgramsStep fieldErrors={fieldErrors} />;
    case 1:
      return <LimitsStep fieldErrors={fieldErrors} />;
    case 2:
      return <SessionStep fieldErrors={fieldErrors} />;
    case 3:
      return <EscalationStep fieldErrors={fieldErrors} />;
    default:
      return null;
  }
}

function ProgramsStep({ fieldErrors }: { fieldErrors: Record<string, string> }) {
  const label = useCreatePolicyWizardStore((s) => s.label);
  const setLabel = useCreatePolicyWizardStore((s) => s.setLabel);
  const allowedPrograms = useCreatePolicyWizardStore((s) => s.allowedPrograms);
  const addProgram = useCreatePolicyWizardStore((s) => s.addProgram);
  const removeProgram = useCreatePolicyWizardStore((s) => s.removeProgram);
  const [input, setInput] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);

  const onAdd = () => {
    setPasteError(null);
    const p = input.trim();
    if (!p) return;
    if (!isValidPubkeyString(p)) { setPasteError("Enter a valid Solana program address."); return; }
    if (allowedPrograms.length >= 10) { setPasteError("Maximum 10 programs."); return; }
    if (allowedPrograms.includes(p)) { setPasteError("Already in the list."); return; }
    addProgram(p);
    setInput("");
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Agent name */}
      <div>
        <div className="mb-1.5 text-[12px] font-medium text-zinc-400">Agent name <span className="text-zinc-600">(optional)</span></div>
        <input
          className={inputClass}
          value={label}
          placeholder="e.g. Yield Bot, Staking Agent..."
          onChange={(e) => setLabel(e.target.value)}
        />
      </div>

      {/* Program selection */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[12px] font-medium text-zinc-400">Allowed Programs</span>
          <span className="rounded-full bg-teal-500/10 px-2 py-0.5 text-[10px] font-semibold text-teal-400">
            {allowedPrograms.length} / 10
          </span>
        </div>
        {fieldErrors.allowedPrograms && <p className="mb-2 text-[11px] text-red-400">{fieldErrors.allowedPrograms}</p>}
        {pasteError && <p className="mb-2 text-[11px] text-red-400">{pasteError}</p>}

        {/* Known program toggles */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {Object.entries(PROGRAM_LABELS).map(([pubkey, programLabel]) => {
            const selected = allowedPrograms.includes(pubkey);
            return (
              <button
                key={pubkey}
                type="button"
                disabled={!selected && allowedPrograms.length >= 10}
                onClick={() => selected ? removeProgram(pubkey) : addProgram(pubkey)}
                className={`rounded-md border px-3 py-1.5 text-[11px] font-medium transition-all ${
                  selected
                    ? "border-teal-500/30 bg-teal-500/10 text-teal-300"
                    : "border-white/[0.06] text-zinc-500 hover:border-teal-500/20 hover:text-zinc-300 disabled:opacity-40"
                }`}
              >
                {programLabel}
              </button>
            );
          })}
        </div>

        {/* Custom input */}
        <div className="flex gap-2">
          <input
            className={`${inputClass} flex-1 font-mono text-[11px]`}
            value={input}
            placeholder="Custom program pubkey..."
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), onAdd())}
          />
          <button
            type="button"
            onClick={onAdd}
            className="shrink-0 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-[12px] font-medium text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
          >
            Add
          </button>
        </div>

        {/* Selected list */}
        {allowedPrograms.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1.5">
            {allowedPrograms.map((pubkey) => (
              <li key={pubkey} className="flex items-center justify-between rounded-md border border-white/[0.05] bg-white/[0.02] px-3 py-2">
                <span className="font-mono text-[11px] text-zinc-300" title={pubkey}>
                  {PROGRAM_LABELS[pubkey] ?? shortenPubkey(pubkey)}
                </span>
                <button
                  type="button"
                  onClick={() => removeProgram(pubkey)}
                  className="text-[10px] font-medium text-red-400/70 transition-colors hover:text-red-300"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function LimitsStep({ fieldErrors }: { fieldErrors: Record<string, string> }) {
  const maxTxSol = useCreatePolicyWizardStore((s) => s.maxTxSol);
  const dailyBudgetSol = useCreatePolicyWizardStore((s) => s.dailyBudgetSol);
  const setMaxTxSol = useCreatePolicyWizardStore((s) => s.setMaxTxSol);
  const setDailyBudgetSol = useCreatePolicyWizardStore((s) => s.setDailyBudgetSol);
  const maxTxInput = useBufferedNumberInput(maxTxSol, setMaxTxSol, Number.parseFloat);
  const dailyBudgetInput = useBufferedNumberInput(dailyBudgetSol, setDailyBudgetSol, Number.parseFloat);

  return (
    <div className="flex flex-col gap-5">
      <p className="text-[13px] text-zinc-400">Set spend limits in SOL. Converted to lamports on-chain.</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <div className="mb-1.5 text-[12px] font-medium text-zinc-400">Max per transaction (SOL)</div>
          <input
            type="text"
            inputMode="decimal"
            className={inputClass}
            value={maxTxInput.inputValue}
            onBlur={maxTxInput.commitValue}
            onChange={(e) => maxTxInput.setInputValue(e.target.value)}
            placeholder="e.g. 5"
          />
          {fieldErrors.maxTxSol && <p className="mt-1 text-[11px] text-red-400">{fieldErrors.maxTxSol}</p>}
        </div>
        <div>
          <div className="mb-1.5 text-[12px] font-medium text-zinc-400">Daily budget (SOL)</div>
          <input
            type="text"
            inputMode="decimal"
            className={inputClass}
            value={dailyBudgetInput.inputValue}
            onBlur={dailyBudgetInput.commitValue}
            onChange={(e) => dailyBudgetInput.setInputValue(e.target.value)}
            placeholder="e.g. 50"
          />
          {fieldErrors.dailyBudgetSol && <p className="mt-1 text-[11px] text-red-400">{fieldErrors.dailyBudgetSol}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-teal-500/15 bg-teal-500/[0.04] px-3.5 py-2.5 text-[12px] text-teal-300">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        At most {maxTxSol || 0} SOL per tx, up to {dailyBudgetSol || 0} SOL rolling 24h.
      </div>
    </div>
  );
}

function SessionStep({ fieldErrors }: { fieldErrors: Record<string, string> }) {
  const sessionDays = useCreatePolicyWizardStore((s) => s.sessionDays);
  const setSessionDays = useCreatePolicyWizardStore((s) => s.setSessionDays);
  const sessionDaysInput = useBufferedNumberInput(sessionDays, setSessionDays, (raw) => Number.parseInt(raw, 10));

  const expiryMs = Date.now() + sessionDays * 86_400_000;
  const dateStr = new Date(expiryMs).toLocaleDateString("en-US", { timeZone: "UTC", year: "numeric", month: "short", day: "numeric" });

  return (
    <div className="flex flex-col gap-5">
      <p className="text-[13px] text-zinc-400">How long the agent session stays valid before requiring renewal.</p>
      <div className="max-w-[240px]">
        <div className="mb-1.5 text-[12px] font-medium text-zinc-400">Days from now (1–90)</div>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          className={inputClass}
          value={sessionDaysInput.inputValue}
          onBlur={sessionDaysInput.commitValue}
          onChange={(e) => sessionDaysInput.setInputValue(e.target.value)}
          placeholder="e.g. 30"
        />
        {fieldErrors.sessionDays && <p className="mt-1 text-[11px] text-red-400">{fieldErrors.sessionDays}</p>}
      </div>
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 text-[12px] text-zinc-400">
        Expires on <span className="font-medium text-zinc-200">{dateStr}</span> (~{sessionDays} days from now)
      </div>
    </div>
  );
}

function EscalationStep({ fieldErrors }: { fieldErrors: Record<string, string> }) {
  const escalationEnabled = useCreatePolicyWizardStore((s) => s.escalationEnabled);
  const multisigMode = useCreatePolicyWizardStore((s) => s.multisigMode);
  const squadsMultisig = useCreatePolicyWizardStore((s) => s.squadsMultisig);
  const multisigMembers = useCreatePolicyWizardStore((s) => s.multisigMembers);
  const multisigThreshold = useCreatePolicyWizardStore((s) => s.multisigThreshold);
  const escalationThresholdSol = useCreatePolicyWizardStore((s) => s.escalationThresholdSol);
  const setEscalationEnabled = useCreatePolicyWizardStore((s) => s.setEscalationEnabled);
  const setMultisigMode = useCreatePolicyWizardStore((s) => s.setMultisigMode);
  const setSquadsMultisig = useCreatePolicyWizardStore((s) => s.setSquadsMultisig);
  const addMember = useCreatePolicyWizardStore((s) => s.addMember);
  const removeMember = useCreatePolicyWizardStore((s) => s.removeMember);
  const setMultisigThreshold = useCreatePolicyWizardStore((s) => s.setMultisigThreshold);
  const setEscalationThresholdSol = useCreatePolicyWizardStore((s) => s.setEscalationThresholdSol);
  const escalationThresholdInput = useBufferedNumberInput(escalationThresholdSol, setEscalationThresholdSol, Number.parseFloat);

  const [memberInput, setMemberInput] = useState("");

  return (
    <div className="flex flex-col gap-5">
      <p className="text-[13px] text-zinc-400">Optionally require a Squads multisig for transactions above a threshold.</p>

      <label className="flex cursor-pointer items-center gap-2.5">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 accent-teal-500"
          checked={escalationEnabled}
          onChange={(e) => setEscalationEnabled(e.target.checked)}
        />
        <span className="text-[13px] font-medium text-zinc-200">Require multisig for large transactions</span>
      </label>

      {escalationEnabled && (
        <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-4">

          {/* Mode toggle */}
          <div className="mb-4 flex rounded-lg border border-white/[0.06] bg-white/[0.02] p-1">
            <button
              type="button"
              onClick={() => setMultisigMode("create")}
              className={`flex-1 rounded-md px-3 py-1.5 text-[11px] font-semibold transition-all ${
                multisigMode === "create" ? "bg-white/[0.08] text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Create New Multisig
            </button>
            <button
              type="button"
              onClick={() => setMultisigMode("existing")}
              className={`flex-1 rounded-md px-3 py-1.5 text-[11px] font-semibold transition-all ${
                multisigMode === "existing" ? "bg-white/[0.08] text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Use Existing Multisig
            </button>
          </div>

          {multisigMode === "create" ? (
            <div className="space-y-4">
              {/* Members */}
              <div>
                <div className="mb-1.5 text-[11px] text-zinc-500">Members ({multisigMembers.length})</div>
                {multisigMembers.map((m) => (
                  <div key={m} className="mb-1.5 flex items-center gap-2">
                    <span className="flex-1 truncate rounded-md border border-white/[0.05] bg-white/[0.02] px-2.5 py-1.5 font-mono text-[10px] text-zinc-300">{m}</span>
                    <button type="button" onClick={() => removeMember(m)} className="text-[10px] font-medium text-red-400/70 hover:text-red-300">Remove</button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    className={`${inputClass} flex-1 font-mono text-[10px]`}
                    value={memberInput}
                    placeholder="Member wallet pubkey..."
                    onChange={(e) => setMemberInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addMember(memberInput); setMemberInput(""); } }}
                  />
                  <button type="button" onClick={() => { addMember(memberInput); setMemberInput(""); }} className="shrink-0 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[11px] font-medium text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200">Add</button>
                </div>
                {fieldErrors.multisigMembers && <p className="mt-1.5 text-[11px] text-red-400">{fieldErrors.multisigMembers}</p>}
              </div>

              {/* Threshold */}
              <div>
                <div className="mb-1.5 text-[11px] text-zinc-500">Approval threshold</div>
                <div className="flex gap-1.5">
                  {Array.from({ length: Math.max(1, multisigMembers.length) }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setMultisigThreshold(n)}
                      className={`rounded-md border px-3 py-1.5 text-[11px] font-medium transition-all ${
                        multisigThreshold === n
                          ? "border-teal-500/30 bg-teal-500/10 text-teal-300"
                          : "border-white/[0.06] text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {n}/{multisigMembers.length}
                    </button>
                  ))}
                </div>
                {fieldErrors.multisigThreshold && <p className="mt-1.5 text-[11px] text-red-400">{fieldErrors.multisigThreshold}</p>}
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-1.5 text-[11px] text-zinc-500">Squads multisig address</div>
              <input
                className={`${inputClass} font-mono text-[11px]`}
                value={squadsMultisig}
                placeholder="Existing multisig pubkey..."
                onChange={(e) => setSquadsMultisig(e.target.value)}
              />
              {fieldErrors.squadsMultisig && <p className="mt-1.5 text-[11px] text-red-400">{fieldErrors.squadsMultisig}</p>}
            </div>
          )}

          {/* Escalation threshold */}
          <div className="mt-4">
            <div className="mb-1.5 text-[11px] text-zinc-500">Escalation threshold (SOL)</div>
            <input
              type="text"
              inputMode="decimal"
              className={inputClass}
              value={escalationThresholdInput.inputValue}
              onBlur={escalationThresholdInput.commitValue}
              onChange={(e) => escalationThresholdInput.setInputValue(e.target.value)}
              placeholder="e.g. 10"
            />
            <p className="mt-1 text-[10px] text-zinc-600">Transactions above this amount require multisig approval</p>
            {fieldErrors.escalationThresholdSol && <p className="mt-1 text-[11px] text-red-400">{fieldErrors.escalationThresholdSol}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
