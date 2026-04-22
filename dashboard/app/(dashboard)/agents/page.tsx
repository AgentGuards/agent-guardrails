"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus, Bot } from "lucide-react"
import { PolicyCard } from "@/components/PolicyCard"
import { PolicyCardSkeleton } from "@/components/PolicyCardSkeleton"
import { EmptyState } from "@/components/EmptyState"
import { ErrorCard } from "@/components/ErrorCard"
import { usePolicies } from "@/lib/hooks/usePolicies"

export default function AgentsPage() {
  const { data: policies, isLoading, isError, error, refetch } = usePolicies()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Agents</h1>
        <Link href="/agents/new">
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Create New Agent
          </Button>
        </Link>
      </div>

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <PolicyCardSkeleton key={i} />)}
        </div>
      )}

      {isError && <ErrorCard message={String(error)} onRetry={refetch} />}

      {!isLoading && !isError && policies?.length === 0 && (
        <EmptyState
          icon={Bot}
          title="No agents yet"
          description="Create your first agent policy to get started."
          action={{ label: "Create Agent", href: "/agents/new" }}
        />
      )}

      {!isLoading && !isError && policies && policies.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...policies]
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .map((policy) => (
              <PolicyCard key={policy.pubkey} policy={policy} />
            ))}
        </div>
      )}
    </div>
  )
}
