"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react"
import { usePolicy } from "@/lib/hooks/usePolicy"
import { useToast } from "@/components/ui/use-toast"
import { lamportsToSol, cn } from "@/lib/utils"

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

export default function EditPolicyPage({ params }: { params: { pubkey: string } }) {
  const { pubkey } = params
  const router = useRouter()
  const { toast } = useToast()
  const { data: policy, isLoading } = usePolicy(pubkey)

  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [initialized, setInitialized] = useState(false)

  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([])
  const [customInput, setCustomInput] = useState("")
  const [customError, setCustomError] = useState("")
  const [maxTxSol, setMaxTxSol] = useState("5")
  const [dailyBudgetSol, setDailyBudgetSol] = useState("50")
  const [sessionDays, setSessionDays] = useState("30")
  const [useMultisig, setUseMultisig] = useState(false)
  const [squadsAddress, setSquadsAddress] = useState("")
  const [escalationThresholdSol, setEscalationThresholdSol] = useState("")

  useEffect(() => {
    if (policy && !initialized) {
      setSelectedPrograms([...policy.allowedPrograms])
      setMaxTxSol(lamportsToSol(policy.maxTxLamports).toString())
      setDailyBudgetSol(lamportsToSol(policy.dailyBudgetLamports).toString())
      const daysLeft = Math.max(1, Math.ceil(
        (Number(policy.sessionExpiry) - Date.now() / 1000) / 86400
      ))
      setSessionDays(daysLeft.toString())
      setUseMultisig(policy.squadsMultisig !== null)
      setSquadsAddress(policy.squadsMultisig ?? "")
      setEscalationThresholdSol(
        policy.escalationThreshold ? lamportsToSol(policy.escalationThreshold).toString() : ""
      )
      setInitialized(true)
    }
  }, [policy, initialized])

  const knownAddresses = new Set(KNOWN_PROGRAMS.map((p) => p.address))
  const customPrograms = selectedPrograms.filter((p) => !knownAddresses.has(p))

  function toggleProgram(address: string) {
    setSelectedPrograms((prev) =>
      prev.includes(address) ? prev.filter((p) => p !== address) : [...prev, address].slice(0, 10)
    )
  }

  function addCustomProgram() {
    if (!isValidPubkey(customInput.trim())) { setCustomError("Invalid Solana address"); return }
    if (selectedPrograms.includes(customInput.trim())) { setCustomError("Already added"); return }
    setSelectedPrograms((prev) => [...prev, customInput.trim()].slice(0, 10))
    setCustomInput("")
    setCustomError("")
  }

  const limitsError =
    parseFloat(dailyBudgetSol) < parseFloat(maxTxSol)
      ? "Daily budget must be ≥ per-transaction limit"
      : ""

  const expiryDate = new Date(Date.now() + parseInt(sessionDays || "30") * 86_400_000)

  async function handleSubmit() {
    setSubmitting(true)
    try {
      if (USE_MOCK) {
        await new Promise((r) => setTimeout(r, 1000))
        toast({ title: "Policy updated", description: "Changes saved successfully." })
        router.push(`/agents/${pubkey}`)
      } else {
        throw new Error("Real on-chain update not yet wired")
      }
    } catch (e) {
      toast({ title: "Failed to update policy", description: String(e), variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-12 w-full max-w-xl" />
        <Skeleton className="h-64 w-full max-w-xl" />
      </div>
    )
  }

  if (!policy) {
    return <p className="text-muted-foreground">Policy not found.</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/agents/${pubkey}`}>
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Agent
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Edit Policy</h1>
      </div>

      <div className="max-w-xl space-y-6">
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
              {step === 1 && "Allowed Programs"}
              {step === 2 && "Spending Limits"}
              {step === 3 && "Session Duration"}
              {step === 4 && "Escalation"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Step 1 */}
            {step === 1 && (
              <>
                <div className="space-y-2">
                  {KNOWN_PROGRAMS.map((prog) => (
                    <div key={prog.address} className="flex items-center gap-3">
                      <Checkbox
                        id={`edit-${prog.address}`}
                        checked={selectedPrograms.includes(prog.address)}
                        onCheckedChange={() => toggleProgram(prog.address)}
                      />
                      <Label htmlFor={`edit-${prog.address}`} className="cursor-pointer">
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
                    <Label className="text-xs text-muted-foreground">Custom programs:</Label>
                    {customPrograms.map((p) => (
                      <div key={p} className="flex items-center justify-between text-xs font-mono bg-muted px-2 py-1 rounded">
                        <span>{p}</span>
                        <button
                          onClick={() => setSelectedPrograms((prev) => prev.filter((x) => x !== p))}
                          className="text-muted-foreground hover:text-foreground ml-2"
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{selectedPrograms.length}/10 programs selected</p>
              </>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <>
                <div className="space-y-1">
                  <Label htmlFor="edit-maxTx">Max per transaction (SOL)</Label>
                  <Input
                    id="edit-maxTx"
                    type="number"
                    min="0.001"
                    max="100"
                    step="0.1"
                    value={maxTxSol}
                    onChange={(e) => setMaxTxSol(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-dailyBudget">Daily budget (SOL)</Label>
                  <Input
                    id="edit-dailyBudget"
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

            {/* Step 3 */}
            {step === 3 && (
              <>
                <div className="space-y-1">
                  <Label htmlFor="edit-sessionDays">Days from now (1–90)</Label>
                  <Input
                    id="edit-sessionDays"
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

            {/* Step 4 */}
            {step === 4 && (
              <>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="edit-useMultisig"
                    checked={useMultisig}
                    onCheckedChange={(v) => setUseMultisig(!!v)}
                  />
                  <Label htmlFor="edit-useMultisig">Require multisig for large transactions</Label>
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
                  {submitting
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                    : "Save Changes"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
