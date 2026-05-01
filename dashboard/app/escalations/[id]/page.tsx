import { EscalationDetailView } from "@/app/escalations/[id]/escalation-detail-view";

export default function EscalationDetailPage({ params }: { params: { id: string } }) {
  return <EscalationDetailView id={params.id} />;
}
