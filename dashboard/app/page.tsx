import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { QueryEmpty } from "@/components/query-states";

export default function Home() {
  return (
    <AppShell
      title="Agent Guardrails Protocol"
      subtitle="Solana policy controls for autonomous agents."
    >
      <QueryEmpty
        title="Welcome"
        description="Sign in to manage policies, watch guarded activity, and review incidents. Connect a wallet when you are ready to create or edit on-chain policies."
        action={
          <>
            <Link
              href="/signin"
              className="rounded-md border border-zinc-600 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
            >
              Sign in
            </Link>
            <Link
              href="/agents"
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            >
              View agents
            </Link>
          </>
        }
      />
    </AppShell>
  );
}
