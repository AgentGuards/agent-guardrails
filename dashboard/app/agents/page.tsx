import { AgentsPageClient } from "@/app/agents/agents-page-client";

export default function AgentsPage({
  searchParams,
}: {
  searchParams?: { new?: string };
}) {
  const startWithNewAgentOpen = searchParams?.new === "1";
  return <AgentsPageClient startWithNewAgentOpen={startWithNewAgentOpen} />;
}
