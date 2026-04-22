"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, CheckCircle2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true"

const KNOWN_PROGRAMS = [
  { address: "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4", label: "Jupiter v6" },
  { address: "MrNEdFKsp4MSGPoQwnZqSxUYEbBYaxQGTdCSg1vmDVJ", label: "Marinade Finance" },
  { address: "11111111111111111111111111111111", label: "System Program" },
  { address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", label: "Token Program" },
]

function isValidPubkey(s: string): boolean {
  return s.length >= 32 && s.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(s)
}

const STEPS = ["Programs", "Limits", "Session", "Escalation"]

export function CreatePolicyWizard() {
  const router = useRouter()
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  // Step 1 — allowed programs
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>(["JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"])
  const [customInput, setCustomInput] = useState("")
  const [customError, setCustomError] = useState("")

  // Step 2 — limits
  const [maxTxSol, setMaxTxSol] = useState("5")
  const [dailyBudgetSol, setDailyBudgetSol] = useState("50")

  // Step 3 — session
  const [sessionDays, setSessionDays] = useState("30")

  // Step 4 — escalation
  const [useMultisig, setUseMultisig] = useState(false)
  const [squadsAddress, setSquadsAddress] = useState("")
  const [escalationThresholdSol, setEscalationThresholdSol] = useState("")

  function toggleProgram(address: string) {
    setSelectedPrograms((prev) =>
      prev.includes(address) ? prev.filter((p) => p !== address) : [...prev, address].slice(0, 10)
    )
  }

  function addCustomProgram() {
    if (!isValidPubkey(customInput.trim())) {
      setCustomError("Invalid Solana address")
      return
    }
    if (selectedPrograms.includes(customInput.trim())) {
      setCustomError("Already added")
      return
    }
    setSelectedPrograms((prev) => [...prev, customInput.trim()].slice(0, 10))
    setCustomInput("")
    setCustomError("")
  }

  const limitsError =
    parseFloat(dailyBudgetSol) < parseFloat(maxTxSol)
      ? "Daily budget must be >= per-transaction limit"
      : ""

  const expiryDate = new Date(Date.now() + parseInt(sessionDays || "30") * 86_400_000)

  // Custom programs are those not in KNOWN_PROGRAMS
  const knownAddresses = new Set(KNOWN_PROGRAMS.map((p) => p.address))
  const customPrograms = selectedPrograms.filter((p) => !knownAddresses.has(p))

  async function handleSubmit() {
    setSubmitting(true)
    try {
      if (USE_MOCK) {
        await new Promise((r) => setTimeout(r, 1500))
        toast({ title: "Policy created!", description: "Redirecting to your agents..." })
        router.push("/agents")
      } else {
        throw new Error("Real on-chain create not yet wired")
      }
    } catch (e) {
      toast({ title: "Failed to create policy", description: String(e), variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => {
          const num = i + 1
          const active = step === num
          const done = step > num
          return (
            <div key={label} className="flex items-center gap-2">
              <div className={cn(
                "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                done ? "bg-emerald-500 text-white" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {done ? <CheckCircle2 className="h-4 w-4" /> : num}
              </div>
              <span className={cn("text-sm", active ? "text-foreground font-medium" : "text-muted-foreground")}>
                {label}
              </span>
              {i < STEPS.length - 1 && <div className="h-px w-8 bg-border mx-1" />}
            </div>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {step === 1 && "Select Allowed Programs"}
            {step === 2 && "Set Spending Limits"}
            {step === 3 && "Session Duration"}
            {step === 4 && "Escalation (Optional)"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 1 — Programs */}
          {step === 1 && (
            <>
              <div className="space-y-2">
                {KNOWN_PROGRAMS.map((prog) => (
                  <div key={prog.address} className="flex items-center gap-3">
                    <Checkbox
                      id={prog.address}
                      checked={selectedPrograms.includes(prog.address)}
                      onCheckedChange={() => toggleProgram(prog.address)}
                    />
                    <Label htmlFor={prog.address} className="cursor-pointer">
                      {prog.label}
                      <span className="text-xs text-muted-foreground ml-2 font-mono">
                        {prog.address.slice(0, 8)}...
                      </span>
                    </Label>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <Label>Custom program address</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Solana program pubkey..."
                    value={customInput}
                    onChange={(e) => { setCustomInput(e.target.value); setCustomError("") }}
                    className="font-mono text-xs"
                  />
                  <Button variant="outline" onClick={addCustomProgram} type="button">Add</Button>
                </div>
                {customError && <p className="text-xs text-red-400">{customError}</p>}
              </div>
              {customPrograms.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Custom programs added:</Label>
                  {customPrograms.map((p) => (
                    <div key={p} className="flex items-center justify-between text-xs font-mono bg-muted px-2 py-1 rounded">
                      <span>{p}</span>
                      <button
                        onClick={() => setSelectedPrograms((prev) => prev.filter((x) => x !== p))}
                        className="text-muted-foreground hover:text-foreground ml-2"
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">{selectedPrograms.length}/10 programs selected</p>
            </>
          )}

          {/* Step 2 — Limits */}
          {step === 2 && (
            <>
              <div className="space-y-1">
                <Label htmlFor="maxTx">Max per transaction (SOL)</Label>
                <Input
                  id="maxTx"
                  type="number"
                  min="0.001"
                  max="100"
                  step="0.1"
                  value={maxTxSol}
                  onChange={(e) => setMaxTxSol(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dailyBudget">Daily budget (SOL)</Label>
                <Input
                  id="dailyBudget"
                  type="number"
                  min="0.01"
                  max="1000"
                  step="1"
                  value={dailyBudgetSol}
                  onChange={(e) => setDailyBudgetSol(e.target.value)}
                />
              </div>
              {limitsError && <p className="text-xs text-red-400">{limitsError}</p>}
            </>
          )}

          {/* Step 3 — Session */}
          {step === 3 && (
            <>
              <div className="space-y-1">
                <Label htmlFor="sessionDays">Days from now (1-90)</Label>
                <Input
                  id="sessionDays"
                  type="number"
                  min="1"
                  max="90"
                  value={sessionDays}
                  onChange={(e) => setSessionDays(e.target.value)}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Expires on <strong className="text-foreground">{expiryDate.toDateString()}</strong> at 00:00 UTC
              </p>
            </>
          )}

          {/* Step 4 — Escalation */}
          {step === 4 && (
            <>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="useMultisig"
                  checked={useMultisig}
                  onCheckedChange={(v) => setUseMultisig(!!v)}
                />
                <Label htmlFor="useMultisig">Require multisig for large transactions</Label>
              </div>
              {useMultisig && (
                <div className="space-y-3 mt-2">
                  <div className="space-y-1">
                    <Label>Squads multisig address</Label>
                    <Input
                      placeholder="Squads multisig pubkey..."
                      value={squadsAddress}
                      onChange={(e) => setSquadsAddress(e.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Threshold in SOL</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 10"
                      value={escalationThresholdSol}
                      onChange={(e) => setEscalationThresholdSol(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-2">
            <Button
              variant="outline"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 1}
            >
              Back
            </Button>
            {step < 4 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={
                  (step === 1 && selectedPrograms.length === 0) ||
                  (step === 2 && !!limitsError)
                }
              >
                Next
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</>
                ) : (
                  "Create Policy"
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
