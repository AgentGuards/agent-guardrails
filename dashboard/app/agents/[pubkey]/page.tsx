import { AppShell } from "@/components/app-shell";

export default function AgentDetailPage({ params }: { params: { pubkey: string } }) {
  return (
    <AppShell
      title="Agent Detail"
      subtitle="Live status, spend view, and recent guarded activity."
    >
      <div className="empty">Agent pubkey: {params.pubkey}</div>
    </AppShell>
  );
}
