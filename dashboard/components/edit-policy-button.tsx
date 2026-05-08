"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { PenLine, X } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { buildUpdatePolicyFullReplace } from "@/lib/create-policy/build-update-args";
import { permissionPolicyToSummary } from "@/lib/create-policy/map-permission-policy";
import { policySummaryToDraft } from "@/lib/create-policy/policy-to-draft";
import {
  isValidPubkeyString,
  validateFullDraft,
  type CreatePolicyDraftInput,
} from "@/lib/create-policy/validate";
import { PROGRAM_LABELS } from "@/lib/mock/policies";
import { GuardrailsClient } from "@/lib/sdk/client";
import { getProgramId, useAnchorProvider } from "@/components/providers";
import type { PolicySummary } from "@/lib/types/dashboard";

function shortenPubkey(pubkey: string): string {
  if (pubkey.length <= 8) return pubkey;
  return `${pubkey.slice(0, 4)}...${pubkey.slice(-4)}`;
}

async function fetchPolicyWithRetry(
  client: GuardrailsClient,
  policyPubkey: PublicKey,
): Promise<Awaited<ReturnType<GuardrailsClient["fetchPolicy"]>>> {
  const delaysMs = [0, 250, 500, 1000];
  let lastResult: Awaited<ReturnType<GuardrailsClient["fetchPolicy"]>> = null;
  for (const delayMs of delaysMs) {
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
    lastResult = await client.fetchPolicy(policyPubkey);
    if (lastResult) return lastResult;
  }
  return lastResult;
}

export function EditPolicyButton({ policy }: { policy: PolicySummary }) {
  const { publicKey } = useWallet();
  const provider = useAnchorProvider();
  const programId = getProgramId();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CreatePolicyDraftInput | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [programInput, setProgramInput] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [memberInput, setMemberInput] = useState("");
  const initializedRef = useRef(false);

  const isOwner = Boolean(publicKey && publicKey.toBase58() === policy.owner);
  const walletReady = Boolean(publicKey && provider && programId);

  if (!isOwner) return null;

  const openModal = () => {
    if (!initializedRef.current) {
      setDraft(policySummaryToDraft(policy));
      initializedRef.current = true;
    }
    setOpen(true);
    setSaveError(null);
    setFieldErrors({});
    setPasteError(null);
  };

  const closeModal = () => {
    if (!saving) setOpen(false);
  };

  const updateDraft = (partial: Partial<CreatePolicyDraftInput>) => {
    setDraft((d) => (d ? { ...d, ...partial } : d));
    setFieldErrors({});
  };

  const addProgram = (pubkey: string) => {
    if (!draft) return;
    const p = pubkey.trim();
    if (!p || !isValidPubkeyString(p)) return;
    if (draft.allowedPrograms.includes(p) || draft.allowedPrograms.length >= 10) return;
    updateDraft({ allowedPrograms: [...draft.allowedPrograms, p] });
  };

  const removeProgram = (pubkey: string) => {
    if (!draft) return;
    updateDraft({ allowedPrograms: draft.allowedPrograms.filter((x) => x !== pubkey) });
  };

  const onSave = async () => {
    if (!draft) return;
    setSaveError(null);
    const { ok, errors } = validateFullDraft(draft);
    if (!ok) { setFieldErrors(errors); return; }
    if (!provider || !programId) { setSaveError("Connect owner wallet."); return; }

    const args = buildUpdatePolicyFullReplace(draft);
    const client = new GuardrailsClient(provider, programId);
    setSaving(true);
    try {
      const policyKey = new PublicKey(policy.pubkey);
      await client.updatePolicy(policyKey, args);
      const chain = await fetchPolicyWithRetry(client, policyKey);
      if (!chain) throw new Error("Could not read policy after update.");
      const summary = permissionPolicyToSummary(policy.pubkey, chain, { createdAt: policy.createdAt });

      queryClient.setQueryData(queryKeys.policy(policy.pubkey), summary);
      queryClient.setQueriesData<PolicySummary[]>({ queryKey: ["policies"] }, (old) => {
        if (!old?.length) return [summary];
        let found = false;
        const next = old.map((row) => { if (row.pubkey !== policy.pubkey) return row; found = true; return summary; });
        return found ? next : [summary, ...next];
      });

      setDraft(policySummaryToDraft(summary));
      toast.success("Policy updated on-chain.");
      setOpen(false);
    } catch (e) {
      const message = getErrorMessage(e);
      setSaveError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-teal-500/30 focus:ring-1 focus:ring-teal-500/20";
  const labelClass = "text-[12px] font-medium text-zinc-400";

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex items-center gap-1.5 rounded-md border border-[#1e1e22] px-3.5 py-2 text-[12px] font-medium text-zinc-400 transition-all hover:border-zinc-600 hover:bg-white/[0.04] hover:text-zinc-200"
      >
        <PenLine size={13} strokeWidth={1.8} /> Edit Policy
      </button>

      {open && draft && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950 shadow-[0_24px_80px_-16px_rgba(0,0,0,0.9)]"
            role="dialog"
            aria-label="Edit policy"
          >
            {/* Blue accent bar */}
            <div className="h-px w-full shrink-0 bg-gradient-to-r from-transparent via-teal-500/50 to-transparent" />

            {/* Header — fixed */}
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/[0.06] px-6 py-5">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal-500/20 bg-teal-500/10">
                  <PenLine size={18} className="text-teal-400" strokeWidth={1.8} />
                </div>
                <div>
                  <h2 className="text-[16px] font-semibold text-zinc-100">Edit Policy</h2>
                  <p className="mt-0.5 text-[13px] text-zinc-400">
                    Update limits, programs, and escalation settings on-chain.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-300"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="flex flex-col gap-6">

                {/* Save error */}
                {saveError && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3 py-2.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0 text-red-400"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                    <p className="text-[12px] leading-relaxed text-red-300">{saveError}</p>
                  </div>
                )}

                {/* ── Allowed Programs ── */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <span className={labelClass}>Allowed Programs</span>
                    <span className="rounded-full bg-teal-500/10 px-2 py-0.5 text-[10px] font-semibold text-teal-400">
                      {draft.allowedPrograms.length} / 10
                    </span>
                  </div>
                  {fieldErrors.allowedPrograms && <p className="mb-2 text-[11px] text-red-400">{fieldErrors.allowedPrograms}</p>}

                  {/* Known program toggles */}
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {Object.entries(PROGRAM_LABELS).map(([pk, label]) => {
                      const selected = draft.allowedPrograms.includes(pk);
                      return (
                        <button
                          key={pk}
                          type="button"
                          onClick={() => selected ? removeProgram(pk) : addProgram(pk)}
                          disabled={!selected && draft.allowedPrograms.length >= 10}
                          className={`rounded-md border px-3 py-1.5 text-[11px] font-medium transition-all ${
                            selected
                              ? "border-teal-500/30 bg-teal-500/10 text-teal-300"
                              : "border-white/[0.06] text-zinc-500 hover:border-teal-500/20 hover:text-zinc-300 disabled:opacity-40"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom program input */}
                  <div className="flex gap-2">
                    <input
                      className={`${inputClass} flex-1 font-mono text-[11px]`}
                      value={programInput}
                      placeholder="Custom program pubkey..."
                      onChange={(e) => setProgramInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter") return;
                        e.preventDefault();
                        setPasteError(null);
                        const p = programInput.trim();
                        if (!isValidPubkeyString(p)) { setPasteError("Invalid address."); return; }
                        if (draft.allowedPrograms.length >= 10) { setPasteError("Max 10."); return; }
                        addProgram(p);
                        setProgramInput("");
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPasteError(null);
                        const p = programInput.trim();
                        if (!isValidPubkeyString(p)) { setPasteError("Invalid address."); return; }
                        if (draft.allowedPrograms.length >= 10) { setPasteError("Max 10."); return; }
                        addProgram(p);
                        setProgramInput("");
                      }}
                      className="shrink-0 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-[12px] font-medium text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
                    >
                      Add
                    </button>
                  </div>
                  {pasteError && <p className="mt-1.5 text-[11px] text-red-400">{pasteError}</p>}

                  {/* Selected programs list */}
                  {draft.allowedPrograms.length > 0 && (
                    <ul className="mt-3 flex flex-col gap-1.5">
                      {draft.allowedPrograms.map((pk) => (
                        <li key={pk} className="flex items-center justify-between rounded-md border border-white/[0.05] bg-white/[0.02] px-3 py-2">
                          <span className="font-mono text-[11px] text-zinc-300" title={pk}>
                            {PROGRAM_LABELS[pk] ?? shortenPubkey(pk)}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeProgram(pk)}
                            className="text-[10px] font-medium text-red-400/70 transition-colors hover:text-red-300"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* ── Spend Limits ── */}
                <div>
                  <span className={`${labelClass} mb-3 block`}>Spend Limits</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="mb-1.5 text-[11px] text-zinc-500">Max per transaction (SOL)</div>
                      <input
                        type="text"
                        inputMode="decimal"
                        className={inputClass}
                        value={Number.isFinite(draft.maxTxSol) ? draft.maxTxSol : ""}
                        onChange={(e) => updateDraft({ maxTxSol: Number.parseFloat(e.target.value) || 0 })}
                      />
                      {fieldErrors.maxTxSol && <p className="mt-1 text-[11px] text-red-400">{fieldErrors.maxTxSol}</p>}
                    </div>
                    <div>
                      <div className="mb-1.5 text-[11px] text-zinc-500">Daily budget (SOL)</div>
                      <input
                        type="text"
                        inputMode="decimal"
                        className={inputClass}
                        value={Number.isFinite(draft.dailyBudgetSol) ? draft.dailyBudgetSol : ""}
                        onChange={(e) => updateDraft({ dailyBudgetSol: Number.parseFloat(e.target.value) || 0 })}
                      />
                      {fieldErrors.dailyBudgetSol && <p className="mt-1 text-[11px] text-red-400">{fieldErrors.dailyBudgetSol}</p>}
                    </div>
                  </div>
                </div>

                {/* ── Session ── */}
                <div>
                  <span className={`${labelClass} mb-3 block`}>Session</span>
                  <div className="max-w-[200px]">
                    <div className="mb-1.5 text-[11px] text-zinc-500">Length (days from now, 1–90)</div>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className={inputClass}
                      value={Number.isFinite(draft.sessionDays) ? draft.sessionDays : ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "" || /^\d+$/.test(v)) updateDraft({ sessionDays: Number.parseInt(v, 10) || 0 });
                      }}
                      placeholder="e.g. 30"
                    />
                    {fieldErrors.sessionDays && <p className="mt-1 text-[11px] text-red-400">{fieldErrors.sessionDays}</p>}
                  </div>
                </div>

                {/* ── Escalation / Multisig ── */}
                <div>
                  <label className="flex cursor-pointer items-center gap-2.5">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 accent-teal-500"
                      checked={draft.escalationEnabled}
                      onChange={(e) =>
                        updateDraft({
                          escalationEnabled: e.target.checked,
                          ...(e.target.checked ? {} : { squadsMultisig: "", escalationThresholdSol: 0, multisigMembers: [], multisigThreshold: 1 }),
                        })
                      }
                    />
                    <span className="text-[13px] font-medium text-zinc-200">Require multisig for large transactions</span>
                  </label>

                  {draft.escalationEnabled && (
                    <div className="mt-3 rounded-lg border border-white/[0.05] bg-white/[0.02] p-4">

                      {/* Mode toggle */}
                      <div className="mb-4 flex rounded-lg border border-white/[0.06] bg-white/[0.02] p-1">
                        <button
                          type="button"
                          onClick={() => updateDraft({ multisigMode: "create" })}
                          className={`flex-1 rounded-md px-3 py-1.5 text-[11px] font-semibold transition-all ${
                            draft.multisigMode === "create"
                              ? "bg-white/[0.08] text-zinc-100 shadow-sm"
                              : "text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          Create New Multisig
                        </button>
                        <button
                          type="button"
                          onClick={() => updateDraft({ multisigMode: "existing" })}
                          className={`flex-1 rounded-md px-3 py-1.5 text-[11px] font-semibold transition-all ${
                            draft.multisigMode === "existing"
                              ? "bg-white/[0.08] text-zinc-100 shadow-sm"
                              : "text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          Use Existing Multisig
                        </button>
                      </div>

                      {draft.multisigMode === "create" ? (
                        <div className="space-y-4">
                          {/* Members list */}
                          <div>
                            <div className="mb-1.5 flex items-center justify-between">
                              <span className="text-[11px] text-zinc-500">Members ({draft.multisigMembers.length})</span>
                            </div>
                            {draft.multisigMembers.map((m) => (
                              <div key={m} className="mb-1.5 flex items-center gap-2">
                                <span className="flex-1 truncate rounded-md border border-white/[0.05] bg-white/[0.02] px-2.5 py-1.5 font-mono text-[10px] text-zinc-300">
                                  {m}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateDraft({ multisigMembers: draft.multisigMembers.filter((x) => x !== m) })}
                                  className="text-[10px] font-medium text-red-400/70 hover:text-red-300"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                            <div className="flex gap-2">
                              <input
                                className={`${inputClass} flex-1 font-mono text-[10px]`}
                                value={memberInput}
                                placeholder="Member wallet pubkey..."
                                onChange={(e) => setMemberInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key !== "Enter") return;
                                  e.preventDefault();
                                  const p = memberInput.trim();
                                  if (isValidPubkeyString(p) && !draft.multisigMembers.includes(p)) {
                                    updateDraft({ multisigMembers: [...draft.multisigMembers, p] });
                                    setMemberInput("");
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const p = memberInput.trim();
                                  if (isValidPubkeyString(p) && !draft.multisigMembers.includes(p)) {
                                    updateDraft({ multisigMembers: [...draft.multisigMembers, p] });
                                    setMemberInput("");
                                  }
                                }}
                                className="shrink-0 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[11px] font-medium text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
                              >
                                Add
                              </button>
                            </div>
                            {fieldErrors.multisigMembers && <p className="mt-1.5 text-[11px] text-red-400">{fieldErrors.multisigMembers}</p>}
                          </div>

                          {/* Approval threshold */}
                          <div>
                            <div className="mb-1.5 text-[11px] text-zinc-500">Approval threshold</div>
                            <div className="flex gap-1.5">
                              {Array.from({ length: Math.max(1, draft.multisigMembers.length) }, (_, i) => i + 1).map((n) => (
                                <button
                                  key={n}
                                  type="button"
                                  onClick={() => updateDraft({ multisigThreshold: n })}
                                  className={`rounded-md border px-3 py-1.5 text-[11px] font-medium transition-all ${
                                    draft.multisigThreshold === n
                                      ? "border-teal-500/30 bg-teal-500/10 text-teal-300"
                                      : "border-white/[0.06] text-zinc-500 hover:text-zinc-300"
                                  }`}
                                >
                                  {n}/{draft.multisigMembers.length}
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
                            value={draft.squadsMultisig}
                            onChange={(e) => updateDraft({ squadsMultisig: e.target.value })}
                            placeholder="Existing multisig pubkey..."
                          />
                          {fieldErrors.squadsMultisig && <p className="mt-1.5 text-[11px] text-red-400">{fieldErrors.squadsMultisig}</p>}
                        </div>
                      )}

                      {/* Escalation threshold (shared) */}
                      <div className="mt-4">
                        <div className="mb-1.5 text-[11px] text-zinc-500">Escalation threshold (SOL)</div>
                        <input
                          type="text"
                          inputMode="decimal"
                          className={inputClass}
                          value={Number.isFinite(draft.escalationThresholdSol) ? draft.escalationThresholdSol : ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === "" || /^\d*\.?\d*$/.test(v)) updateDraft({ escalationThresholdSol: Number.parseFloat(v) || 0 });
                          }}
                          placeholder="e.g. 10"
                        />
                        <p className="mt-1 text-[10px] text-zinc-600">Transactions above this amount require multisig approval</p>
                        {fieldErrors.escalationThresholdSol && <p className="mt-1 text-[11px] text-red-400">{fieldErrors.escalationThresholdSol}</p>}
                      </div>
                    </div>
                  )}
                </div>


              </div>
            </div>

            {/* Footer — fixed */}
            <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-white/[0.06] px-6 py-4">
              <button
                type="button"
                disabled={saving}
                onClick={closeModal}
                className="rounded-lg border border-white/[0.08] bg-transparent px-4 py-2 text-[13px] font-medium text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-zinc-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!walletReady || saving}
                onClick={() => void onSave()}
                className="rounded-lg border border-teal-500/30 bg-teal-600 px-4 py-2 text-[13px] font-semibold text-white shadow-[0_0_12px_rgba(0,255,209,0.15)] transition-all hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Saving...
                  </span>
                ) : "Save on-chain"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
