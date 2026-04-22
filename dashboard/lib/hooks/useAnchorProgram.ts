"use client"

import { useMemo } from "react"
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react"
import { AnchorProvider, Program } from "@coral-xyz/anchor"
import { PublicKey } from "@solana/web3.js"
import IDL from "@/lib/sdk/idl/guardrails.json"

const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_GUARDRAILS_PROGRAM_ID || "11111111111111111111111111111111"
)

export function useAnchorProgram() {
  const { connection } = useConnection()
  const wallet = useAnchorWallet()

  return useMemo(() => {
    if (!wallet) return null
    const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" })
    return new Program(IDL as any, provider)
  }, [connection, wallet])
}
