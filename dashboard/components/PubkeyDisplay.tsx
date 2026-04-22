"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { shortenPubkey } from "@/lib/utils"

export function PubkeyDisplay({ pubkey }: { pubkey: string }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(pubkey).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={copy}
            className="flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <code>{shortenPubkey(pubkey)}</code>
            {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-mono text-xs">{pubkey}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
