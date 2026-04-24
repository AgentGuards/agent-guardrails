import { AppShell } from "@/components/app-shell";

export default function EditPolicyPage({ params }: { params: { pubkey: string } }) {
  return (
    <AppShell
      title="Edit Policy"
      subtitle="Update limits, session expiry, and allowed programs."
    >
      <div className="empty">Policy editor for {params.pubkey} is planned for Phase 4.</div>
    </AppShell>
  );
}
