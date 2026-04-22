"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, OctagonX, AlertTriangle } from "lucide-react"
import type { Policy } from "@/lib/types/anomaly"
import { useToast } from "@/components/ui/use-toast"
import { shortenPubkey } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface KillSwitchButtonProps {
  policy: Policy
  onPaused?: () => void
}

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true"

export function KillSwitchButton({ policy, onPaused }: KillSwitchButtonProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  if (!policy.isActive) return null

  const charCount = reason.length
  const charCountClass = charCount > 60
    ? "text-red-400"
    : charCount > 48
    ? "text-amber-400"
    : "text-muted-foreground"

  async function handleConfirm() {
    if (!reason.trim()) return
    setLoading(true)
    try {
      if (USE_MOCK) {
        await new Promise((r) => setTimeout(r, 500))
        const paused = { ...policy, isActive: false }
        queryClient.setQueryData(["policy", policy.pubkey], paused)
        queryClient.setQueryData(["policies"], (old: Policy[] | undefined) =>
          (old ?? []).map((p) => (p.pubkey === policy.pubkey ? paused : p))
        )
        toast({ title: "Agent paused", description: `${policy.label ?? shortenPubkey(policy.pubkey)} has been paused.` })
        onPaused?.()
        setOpen(false)
        setReason("")
      } else {
        // Real on-chain tx wired in Phase 9
        throw new Error("Real pause not yet wired")
      }
    } catch (e) {
      toast({ title: "Failed to pause agent", description: String(e), variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all hover:scale-105 active:scale-95"
      >
        <OctagonX className="h-4 w-4" /> Pause Agent
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pause {policy.label ?? shortenPubkey(policy.pubkey)}?</DialogTitle>
            <DialogDescription>
              This will immediately stop all transactions from this agent.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-md mb-4">
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
            <span className="text-red-400 text-sm font-medium">This will immediately block all transactions for this agent.</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason <span className="text-red-400">*</span></Label>
            <Input
              id="reason"
              placeholder="Enter a reason for pausing..."
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 64))}
              maxLength={64}
            />
            <p className={cn("text-xs text-right", charCountClass)}>{charCount}/64</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <button
              disabled={!reason.trim() || loading}
              onClick={handleConfirm}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/30 transition-all hover:scale-105 active:scale-95",
                (!reason.trim() || loading) && "opacity-50 cursor-not-allowed hover:scale-100"
              )}
            >
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Pausing...</> : "Confirm Pause"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
