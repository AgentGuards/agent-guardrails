"use client"

import React, { useState, useMemo } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets"
import { SiwsProvider } from "@/lib/providers/SiwsContext"
import { Toaster } from "@/components/ui/toaster"
import { useSSE } from "@/lib/sse/useSSE"

// eslint-disable-next-line @typescript-eslint/no-require-imports
require("@solana/wallet-adapter-react-ui/styles.css")

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "http://localhost:8899"

// Type cast helpers to work around React 17 FC<> vs React 18 JSX type mismatch
// in @solana/wallet-adapter packages (they use FC which omits children in React 18)
const SafeConnectionProvider = ConnectionProvider as React.ComponentType<{
  endpoint: string
  children: React.ReactNode
}>
const SafeWalletProvider = WalletProvider as React.ComponentType<{
  wallets: (PhantomWalletAdapter | SolflareWalletAdapter)[]
  autoConnect: boolean
  children: React.ReactNode
}>
const SafeWalletModalProvider = WalletModalProvider as React.ComponentType<{
  children: React.ReactNode
}>

function SSEMount() {
  useSSE()
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  )

  return (
    <QueryClientProvider client={queryClient}>
      <SafeConnectionProvider endpoint={RPC_URL}>
        <SafeWalletProvider wallets={wallets} autoConnect>
          <SafeWalletModalProvider>
            <SiwsProvider>
              <SSEMount />
              {children}
              <Toaster />
            </SiwsProvider>
          </SafeWalletModalProvider>
        </SafeWalletProvider>
      </SafeConnectionProvider>
    </QueryClientProvider>
  )
}
