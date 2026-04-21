// TODO: Agent detail — live status, spend gauge, recent txns, controls
export default function AgentDetailPage({ params }: { params: { pubkey: string } }) {
  return <div>Agent: {params.pubkey}</div>;
}
