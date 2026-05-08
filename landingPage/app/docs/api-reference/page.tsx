import Prose from '../../components/docs/prose'
import EndpointCard from '../../components/docs/endpoint-card'

export default function ApiReferencePage() {
  return (
    <Prose>
      <h1>API Reference</h1>

      <p>
        REST API served by the Express server. Base URL is configured via the{' '}
        <code>NEXT_PUBLIC_API_URL</code> environment variable. All requests
        include <code>credentials: &quot;include&quot;</code> for cookie-based
        authentication.
      </p>

      <h2>Authentication</h2>

      <p>
        The server uses SIWS (Sign In With Solana) for authentication. The
        flow starts with a nonce request, the wallet signs a message containing
        the nonce, and the server verifies the signature to issue a JWT stored
        in an httpOnly cookie. All protected routes automatically filter data
        by the authenticated wallet public key.
      </p>

      <h2>Auth Endpoints</h2>

      <EndpointCard
        method="POST"
        path="/api/auth/siws/nonce"
        description="Generate a SIWS nonce for wallet signing. Returns a unique nonce string that must be included in the SIWS message signed by the wallet."
        auth={false}
      />

      <EndpointCard
        method="POST"
        path="/api/auth/siws/verify"
        description="Verify the wallet signature and issue a JWT. Expects the signed SIWS message and signature in the request body. Sets an httpOnly cookie on success."
        auth={false}
      />

      <EndpointCard
        method="DELETE"
        path="/api/auth/sessions"
        description="Revoke all active sessions for the authenticated wallet and clear the JWT cookie."
      />

      <h2>Transaction Endpoints</h2>

      <EndpointCard
        method="GET"
        path="/api/transactions"
        description="Paginated list of guarded transactions for the authenticated wallet. Returns transaction signature, verdict, amount, target program, and timestamp."
      >
        <p><strong>Query parameters:</strong></p>
        <ul>
          <li><code>limit</code> &mdash; Number of results per page (default: 20)</li>
          <li><code>offset</code> &mdash; Pagination offset (default: 0)</li>
          <li><code>policy</code> &mdash; Filter by policy PDA public key</li>
        </ul>
      </EndpointCard>

      <EndpointCard
        method="GET"
        path="/api/transactions/:sig"
        description="Transaction detail by on-chain signature. Includes the Guardian Agent verdict, associated incident (if any), and prev/next navigation links."
      />

      <h2>Incident Endpoints</h2>

      <EndpointCard
        method="GET"
        path="/api/incidents"
        description="Paginated list of agent pause incidents for the authenticated wallet. Each incident includes the pause reason, who triggered it, and whether a Guardian Agent report is attached."
      >
        <p><strong>Query parameters:</strong></p>
        <ul>
          <li><code>limit</code> &mdash; Number of results per page (default: 20)</li>
          <li><code>offset</code> &mdash; Pagination offset (default: 0)</li>
          <li><code>policy</code> &mdash; Filter by policy PDA public key</li>
        </ul>
      </EndpointCard>

      <EndpointCard
        method="GET"
        path="/api/incidents/:id"
        description="Incident detail by UUID. Returns the full Guardian Agent report including behavioral analysis, risk assessment, and recommended actions."
      />

      <h2>Policy Endpoints</h2>

      <EndpointCard
        method="GET"
        path="/api/policies"
        description="All policies owned by the authenticated wallet. Returns policy PDA, agent key, label, active status, and on-chain configuration summary."
      />

      <EndpointCard
        method="PATCH"
        path="/api/policies/:pubkey"
        description="Update the policy label (a database-only field not stored on-chain). Used for giving agents human-readable names in the dashboard."
      />

      <h2>Escalation Endpoints</h2>

      <EndpointCard
        method="POST"
        path="/api/escalations/report"
        description="Report an escalated transaction. Called when a guarded_execute fails with EscalatedToMultisig, recording the transaction details for Squads proposal creation."
      />

      <EndpointCard
        method="GET"
        path="/api/escalations"
        description="List all escalation proposals for policies owned by the authenticated wallet. Includes proposal status, amount, and associated policy."
      />

      <EndpointCard
        method="GET"
        path="/api/escalations/:id"
        description="Escalation detail by UUID. Returns the reconstructed instruction data, target program, amount, and current Squads proposal status."
      />

      <EndpointCard
        method="PATCH"
        path="/api/escalations/:id"
        description="Update an escalation record with the Squads proposal PDA and transaction index after the multisig proposal has been created on-chain."
      />

      <h2>Fleet Endpoints</h2>

      <EndpointCard
        method="GET"
        path="/api/fleet/summary"
        description="Aggregated fleet metrics for the authenticated wallet. Returns counts of active and paused agents, total incidents, aggregate spend across all policies, and 24h trend data."
      />

      <EndpointCard
        method="GET"
        path="/api/spend-trackers"
        description="On-chain spend tracker snapshots for all policies owned by the wallet. Includes policy metadata, 24h and 1h spend totals, transaction counts, and budget utilization percentages."
      />

      <h2>Real-Time Events (SSE)</h2>

      <EndpointCard
        method="GET"
        path="/api/events"
        description="Server-Sent Events stream for real-time dashboard updates. Opens a persistent connection that pushes events as they occur. Events carry full payloads and are inserted directly into the client-side TanStack Query cache."
      />

      <p>
        The SSE stream emits the following event types. Each event includes a{' '}
        <code>type</code> field and a <code>data</code> payload:
      </p>

      <table>
        <thead>
          <tr>
            <th>Event Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>new_transaction</code></td>
            <td>A new guarded transaction has been recorded</td>
          </tr>
          <tr>
            <td><code>verdict</code></td>
            <td>Guardian Agent has rendered a verdict on a transaction</td>
          </tr>
          <tr>
            <td><code>agent_paused</code></td>
            <td>An agent has been paused via the kill switch</td>
          </tr>
          <tr>
            <td><code>report_ready</code></td>
            <td>Guardian Agent incident report is available</td>
          </tr>
          <tr>
            <td><code>escalation_created</code></td>
            <td>A new escalation proposal has been created</td>
          </tr>
          <tr>
            <td><code>escalation_updated</code></td>
            <td>An escalation proposal status has changed</td>
          </tr>
          <tr>
            <td><code>agent_rotated</code></td>
            <td>An agent key rotation has completed</td>
          </tr>
          <tr>
            <td><code>policy_closed</code></td>
            <td>A policy has been permanently closed</td>
          </tr>
        </tbody>
      </table>

      <h2>Audit &amp; Settings</h2>

      <EndpointCard
        method="GET"
        path="/api/audit"
        description="Unified action timeline for all policies owned by the wallet. Includes pause, resume, rotate, close, and escalation events in chronological order."
      />

      <EndpointCard
        method="GET"
        path="/api/session"
        description="Current JWT session metadata including wallet public key, issued-at timestamp, and expiration."
      />

      <EndpointCard
        method="GET"
        path="/api/settings/webhook-status"
        description="Helius webhook configuration and ingestion metrics. Returns the registered webhook URL, last event timestamp, and event counts."
      />

      <EndpointCard
        method="GET"
        path="/api/settings/llm"
        description="Resolved LLM model configuration for the Guardian Agent. Returns the active model name, provider, and any overrides."
      />
    </Prose>
  )
}
