"use client"

import React, { createContext, useContext, useState, useCallback } from "react"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ""
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true"
const MOCK_OWNER = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"

interface SiwsContextType {
  isAuthenticated: boolean
  walletPubkey: string | null
  isLoading: boolean
  signIn: () => Promise<void>
  signOut: () => void
}

const SiwsContext = createContext<SiwsContextType>({
  isAuthenticated: false,
  walletPubkey: null,
  isLoading: false,
  signIn: async () => {},
  signOut: () => {},
})

export function SiwsProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [walletPubkey, setWalletPubkey] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const signIn = useCallback(async () => {
    setIsLoading(true)
    try {
      if (USE_MOCK) {
        await new Promise((r) => setTimeout(r, 500))
        setIsAuthenticated(true)
        setWalletPubkey(MOCK_OWNER)
        return
      }
      // Real SIWS flow wired in Phase 9
      throw new Error("Real SIWS not yet wired — set NEXT_PUBLIC_USE_MOCK=true")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const signOut = useCallback(() => {
    setIsAuthenticated(false)
    setWalletPubkey(null)
  }, [])

  return (
    <SiwsContext.Provider value={{ isAuthenticated, walletPubkey, isLoading, signIn, signOut }}>
      {children}
    </SiwsContext.Provider>
  )
}

export function useSiws() {
  return useContext(SiwsContext)
}
