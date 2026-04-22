"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Shield, Bot, Activity, AlertTriangle, Menu, LogOut } from "lucide-react"
import { useUIStore } from "@/lib/stores/ui"
import { useSiws } from "@/lib/providers/SiwsContext"
import { cn } from "@/lib/utils"
import { shortenPubkey } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/incidents", label: "Incidents", icon: AlertTriangle },
]

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const { walletPubkey, isAuthenticated, signOut } = useSiws()
  const pathname = usePathname()

  return (
    <div className={cn(
      "flex flex-col bg-card border-r border-border transition-all duration-300",
      sidebarOpen ? "w-64" : "w-16"
    )}>
      {/* Header */}
      <div className="flex items-center h-16 px-4 border-b border-border">
        <div className="rounded-lg bg-primary/20 p-2 shrink-0 shadow-sm shadow-primary/20">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <span
          className={cn(
            "ml-2 font-semibold text-sm overflow-hidden transition-all duration-300 whitespace-nowrap",
            sidebarOpen ? "opacity-100 max-w-[160px]" : "opacity-0 max-w-0"
          )}
        >
          Agent Guardrails
        </span>
        <button
          onClick={toggleSidebar}
          className="ml-auto rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors border-l-2",
                active
                  ? "bg-primary/10 text-primary border-l-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground border-l-transparent"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span
                className={cn(
                  "overflow-hidden transition-all duration-300 whitespace-nowrap",
                  sidebarOpen ? "opacity-100 max-w-[160px]" : "opacity-0 max-w-0"
                )}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      {isAuthenticated && walletPubkey && (
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-primary">
                {walletPubkey.slice(0, 1).toUpperCase()}
              </span>
            </div>
            <div className={cn("flex-1 min-w-0 overflow-hidden transition-all duration-300", sidebarOpen ? "opacity-100 max-w-[120px]" : "opacity-0 max-w-0")}>
              <p className="text-xs text-muted-foreground truncate font-mono">{shortenPubkey(walletPubkey)}</p>
            </div>
            <button
              onClick={signOut}
              className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
