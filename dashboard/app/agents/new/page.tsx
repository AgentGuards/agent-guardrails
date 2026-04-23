"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/dashboard-ui";

const PROGRAM_OPTIONS = ["Jupiter v6", "Marinade Finance", "System Program", "Token Program"];

export default function NewAgentPage() {
  const [step, setStep] = useState(1);
  const [programs, setPrograms] = useState<string[]>(["Jupiter v6", "System Program"]);
  const [maxTx, setMaxTx] = useState("5");
  const [dailyBudget, setDailyBudget] = useState("50");
  const [sessionDays, setSessionDays] = useState("30");
  const [enableEscalation, setEnableEscalation] = useState(false);
  const [squadsAddress, setSquadsAddress] = useState("");
  const [threshold, setThreshold] = useState("10");
  const router = useRouter();

  const invalid = Number(dailyBudget) < Number(maxTx);
  const expiry = useMemo(() => {
    const target = new Date(Date.now() + Number(sessionDays || 0) * 86_400_000);
    return Number.isNaN(target.getTime()) ? "Invalid date" : target.toUTCString();
  }, [sessionDays]);

  function handleSubmit() {
    router.push("/agents");
  }

  return (
    <AppShell title="Create policy" subtitle="Define allowed programs, budgets, session expiry, and escalation behavior.">
      <div className="card">
        <div className="wizard-steps">
          {["Programs", "Limits", "Session", "Escalation"].map((label, index) => (
            <div key={label} className={`step ${step === index + 1 ? "active" : ""}`}>{index + 1}. {label}</div>
          ))}
        </div>

        {step === 1 ? (
          <div className="grid two">
            <div className="field">
              <label>Allowed programs</label>
              <select
                className="input"
                onChange={(event) => {
                  const value = event.target.value;
                  if (value && !programs.includes(value) && programs.length < 10) {
                    setPrograms((current) => [...current, value]);
                  }
                }}
                value=""
              >
                <option value="">Add a program</option>
                {PROGRAM_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Current set</label>
              <div className="list">
                {programs.map((program) => (
                  <div key={program} className="row-card spread">
                    <span>{program}</span>
                    <button className="button button-secondary" onClick={() => setPrograms((current) => current.filter((item) => item !== program))}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid two">
            <div className="field">
              <label>Max per transaction (SOL)</label>
              <input className="input" value={maxTx} onChange={(event) => setMaxTx(event.target.value)} />
            </div>
            <div className="field">
              <label>Daily budget (SOL)</label>
              <input className="input" value={dailyBudget} onChange={(event) => setDailyBudget(event.target.value)} />
            </div>
            <div className="card" style={{ gridColumn: "1 / -1" }}>
              <div className="card-title">Validation</div>
              <p className="muted">
                {invalid
                  ? "Daily budget must be greater than or equal to the per-transaction cap."
                  : `A maximum of ${maxTx} SOL can be spent per transaction, with a ${dailyBudget} SOL rolling daily budget.`}
              </p>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="grid two">
            <div className="field">
              <label>Days from now</label>
              <input className="input" value={sessionDays} onChange={(event) => setSessionDays(event.target.value)} />
            </div>
            <div className="card">
              <div className="card-title">Computed expiry</div>
              <div className="metric-value" style={{ fontSize: "1rem" }}>{expiry}</div>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="grid two">
            <div className="field">
              <label>
                <input
                  type="checkbox"
                  checked={enableEscalation}
                  onChange={(event) => setEnableEscalation(event.target.checked)}
                  style={{ marginRight: 8 }}
                />
                Require multisig escalation for large transactions
              </label>
            </div>
            {enableEscalation ? (
              <>
                <div className="field">
                  <label>Squads multisig address</label>
                  <input className="input" value={squadsAddress} onChange={(event) => setSquadsAddress(event.target.value)} />
                </div>
                <div className="field">
                  <label>Escalation threshold (SOL)</label>
                  <input className="input" value={threshold} onChange={(event) => setThreshold(event.target.value)} />
                </div>
              </>
            ) : null}
          </div>
        ) : null}

        <div className="spread" style={{ marginTop: 20 }}>
          <button className="button button-secondary" disabled={step === 1} onClick={() => setStep((current) => current - 1)}>
            Previous
          </button>
          {step < 4 ? (
            <button className="button button-primary" disabled={step === 2 && invalid} onClick={() => setStep((current) => current + 1)}>
              Next
            </button>
          ) : (
            <button className="button button-primary" onClick={handleSubmit}>Save draft policy</button>
          )}
        </div>
      </div>
    </AppShell>
  );
}
