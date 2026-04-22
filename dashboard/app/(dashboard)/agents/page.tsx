"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus, Bot } from "lucide-react"
import { motion } from "framer-motion"
import { PolicyCard } from "@/components/PolicyCard"
import { PolicyCardSkeleton } from "@/components/PolicyCardSkeleton"
import { EmptyState } from "@/components/EmptyState"
import { ErrorCard } from "@/components/ErrorCard"
import { usePolicies } from "@/lib/hooks/usePolicies"

export default function AgentsPage() {
  const { data: policies, isLoading, isError, error, refetch } = usePolicies()

  const sorted = policies
    ? [...policies].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    : []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Agents</h1>
          {!isLoading && !isError && policies && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {policies.length} agent{policies.length !== 1 ? "s" : ""} monitored
            </p>
          )}
        </div>
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

      {!isLoading && !isError && sorted.length === 0 && (
        <EmptyState
          icon={Bot}
          title="No agents yet"
          description="Create your first agent policy to get started."
          action={{ label: "Create Agent", href: "/agents/new" }}
        />
      )}

      {!isLoading && !isError && sorted.length > 0 && (
        <motion.div
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.07 } }, hidden: {} }}
        >
          {sorted.map((policy) => (
            <motion.div
              key={policy.pubkey}
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0 },
              }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <PolicyCard policy={policy} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
