import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function shortenPubkey(pubkey: string): string {
  if (pubkey.length <= 8) return pubkey
  return `${pubkey.slice(0, 4)}...${pubkey.slice(-4)}`
}

export function lamportsToSol(lamports: string | bigint): number {
  return Number(lamports) / 1_000_000_000
}

export function formatTimeAgo(isoString: string): string {
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function spendPercent(spent: string, budget: string): number {
  const b = Number(budget)
  if (b === 0) return 0
  return (Number(spent) / b) * 100
}
