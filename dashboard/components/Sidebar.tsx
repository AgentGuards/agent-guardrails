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
        <Shield className="h-6 w-6 text-primary shrink-0" />
        {sidebarOpen && <span className="ml-2 font-semibold text-sm truncate">Agent Guardrails</span>}
        <button onClick={toggleSidebar} className="ml-auto text-muted-foreground hover:text-foreground">
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
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {sidebarOpen && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      {isAuthenticated && walletPubkey && (
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-2">
            <div className={cn("flex-1 min-w-0", !sidebarOpen && "hidden")}>
              <p className="text-xs text-muted-foreground truncate font-mono">{shortenPubkey(walletPubkey)}</p>
            </div>
            <button onClick={signOut} className="text-muted-foreground hover:text-foreground shrink-0">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
