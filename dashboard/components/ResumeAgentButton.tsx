"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Loader2, PlayCircle } from "lucide-react"
import type { Policy } from "@/lib/types/anomaly"
import { useToast } from "@/components/ui/use-toast"
import { shortenPubkey } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface ResumeAgentButtonProps {
  policy: Policy
  onResumed?: () => void
}

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true"

export function ResumeAgentButton({ policy, onResumed }: ResumeAgentButtonProps) {
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  if (policy.isActive) return null

  async function handleResume() {
    setLoading(true)
    try {
      if (USE_MOCK) {
        await new Promise((r) => setTimeout(r, 500))
        const resumed = { ...policy, isActive: true }
        queryClient.setQueryData(["policy", policy.pubkey], resumed)
        queryClient.setQueryData(["policies"], (old: Policy[] | undefined) =>
          (old ?? []).map((p) => (p.pubkey === policy.pubkey ? resumed : p))
        )
        toast({
          title: "Agent resumed",
          description: `${policy.label ?? shortenPubkey(policy.pubkey)} is now active.`,
        })
        onResumed?.()
      } else {
        throw new Error("Real resume not yet wired")
      }
    } catch (e) {
      toast({ title: "Failed to resume agent", description: String(e), variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleResume}
      disabled={loading}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border",
        "bg-emerald-600/20 border-emerald-500/60 text-emerald-300 hover:bg-emerald-600/30",
        "shadow-sm shadow-emerald-500/10 hover:scale-105 active:scale-95 transition-all",
        loading && "opacity-50 cursor-not-allowed hover:scale-100"
      )}
    >
      {loading
        ? <><Loader2 className="h-4 w-4 animate-spin" /> Resuming...</>
        : <><PlayCircle className="h-4 w-4" /> Resume Agent</>}
    </button>
  )
}
