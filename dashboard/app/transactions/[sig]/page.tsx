import { TransactionDetailView } from "@/app/transactions/[sig]/transaction-detail-view";

export default function TransactionDetailPage({ params }: { params: { sig: string } }) {
  return <TransactionDetailView sig={params.sig} />;
}
