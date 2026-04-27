import { ProposalsView } from "./proposals-view";

export default function ProposalsPage({ params }: { params: { pubkey: string } }) {
  return <ProposalsView pubkey={params.pubkey} />;
}
