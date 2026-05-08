import Prose from '../../components/docs/prose'
import CodeBlock from '../../components/docs/code-block'
import Callout from '../../components/docs/callout'

export default function ArchitecturePage() {
  return (
    <Prose>
      <h1>System Architecture</h1>

      <p>
        Agent Guardrails is a three-tier system: an on-chain Solana program enforces
        policies at the instruction level, an off-chain server runs a monitoring
        pipeline with AI-powered anomaly detection, and a Next.js dashboard provides
        real-time visibility into agent activity. Every agent transaction flows through
        all three tiers before it is considered settled.
      </p>

      <h2>System Topology</h2>

      <p>
        The following diagram shows the full path of an agent transaction from
        initiation to dashboard display.
      </p>

      <CodeBlock>
{`Agent (session key)
  -> guarded_execute (on-chain validation)
  -> CPI to target program (Jupiter, Marinade, etc.)
  -> emit event
  -> Helius webhook
  -> Server ingestion pipeline
  -> Prefilter (cheap statistical checks)
  -> Guardian Agent judge (LLM analysis)
  -> Verdict (allow / flag / pause)
  -> Executor (pause_agent on-chain if needed)
  -> SSE push to dashboard
  -> Live incident timeline`}
      </CodeBlock>

      <h2>On-Chain Components</h2>

      <p>
        The Anchor program defines two primary PDAs that govern agent behavior:
      </p>

      <ul>
        <li>
          <strong>PermissionPolicy PDA</strong> &mdash; seeds:{' '}
          <code>[&quot;policy&quot;, owner, agent]</code>. Stores the program
          allow-list, per-transaction cap, daily budget, session expiry, and
          pause state. Funds deposited by the owner live in this PDA &mdash; the
          agent keypair never holds SOL directly.
        </li>
        <li>
          <strong>SpendTracker PDA</strong> &mdash; seeds:{' '}
          <code>[&quot;tracker&quot;, policy]</code>. Tracks rolling spend totals,
          transaction counts, and the last-reset timestamp. The{' '}
          <code>guarded_execute</code> instruction checks both PDAs before
          forwarding the CPI to the target program.
        </li>
      </ul>

      <p>
        This design means the agent keypair is only an authorized signer, not a
        fund holder. Even if the agent&#39;s private key is fully compromised, the
        attacker cannot transfer funds without going through{' '}
        <code>guarded_execute</code>, which enforces all policy constraints.
      </p>

      <h2>Off-Chain Components</h2>

      <p>
        The server is an Express application that runs the monitoring pipeline and
        exposes a REST API for the dashboard.
      </p>

      <ul>
        <li>
          <strong>Express Server</strong> &mdash; handles API routes for
          authentication (SIWS), agent CRUD, activity queries, and incident
          management. Also serves the SSE endpoint at{' '}
          <code>GET /api/events</code> for real-time dashboard updates.
        </li>
        <li>
          <strong>Worker Pipeline</strong> &mdash; a 5-stage pipeline (Ingest,
          Prefilter, Judge, Executor, Reporter) processes every webhook event.
          Stages run in sequence per transaction but the pipeline handles
          concurrent transactions.
        </li>
        <li>
          <strong>Neon Postgres (via Prisma)</strong> &mdash; stores transaction
          history, verdicts, incidents, and full postmortem reports. The dashboard
          queries this data through the server&#39;s REST API.
        </li>
        <li>
          <strong>Guardian Agent</strong> &mdash; the AI judge in the pipeline.
          It evaluates flagged transactions on the hot path (verdict in
          milliseconds) and generates async postmortem reports for incidents.
          Uses structured JSON output for deterministic verdict parsing.
        </li>
      </ul>

      <h2>Frontend</h2>

      <p>
        The dashboard is a Next.js 14 application using the App Router. It is
        frontend-only &mdash; no API routes, no direct database access.
      </p>

      <ul>
        <li>
          <strong>TanStack Query v5</strong> &mdash; manages all server state
          with 30-second stale times. SSE events update the cache directly via{' '}
          <code>setQueryData</code> to avoid unnecessary refetches.
        </li>
        <li>
          <strong>Zustand</strong> &mdash; handles client-side UI state such as
          sidebar open/close, filter selections, and active tabs.
        </li>
        <li>
          <strong>SSE (Server-Sent Events)</strong> &mdash; the{' '}
          <code>useSSE</code> hook opens an <code>EventSource</code> connection
          to the server&#39;s <code>GET /api/events</code> endpoint. Events
          carry full payloads and are inserted directly into the TanStack cache.
        </li>
        <li>
          <strong>Wallet Adapter</strong> &mdash; supports Phantom, Solflare, and
          Backpack via <code>@solana/wallet-adapter-react</code>.
        </li>
      </ul>

      <h2>Transaction Lifecycle</h2>

      <p>
        Every agent transaction follows this 8-step lifecycle from request to
        dashboard display:
      </p>

      <ol>
        <li>
          The agent submits a transaction calling{' '}
          <code>guarded_execute</code> with the target program, instruction data,
          and transfer amount.
        </li>
        <li>
          The on-chain program validates the agent&#39;s session key, checks the
          policy is active (not paused), verifies the target program is in the
          allow-list, and confirms the amount is within per-transaction and daily
          budget limits.
        </li>
        <li>
          If all checks pass, the program performs a CPI to the target program
          and emits a <code>GuardedExecute</code> event with transaction details.
        </li>
        <li>
          Helius detects the event via its webhook configuration and POSTs the
          parsed transaction data to the server&#39;s{' '}
          <code>/webhook</code> endpoint.
        </li>
        <li>
          The server&#39;s Ingest stage parses the webhook payload, creates a{' '}
          <code>GuardedTxn</code> database row, and emits a{' '}
          <code>new_transaction</code> SSE event.
        </li>
        <li>
          The Prefilter stage runs 13 statistical checks. If no signals fire, the
          transaction is auto-allowed. Otherwise, it is forwarded to the Guardian
          Agent judge.
        </li>
        <li>
          The Guardian Agent evaluates the transaction context and returns a
          structured verdict (ALLOW, FLAG, or PAUSE) with confidence and
          reasoning. If PAUSE, the Executor stage signs and submits a{' '}
          <code>pause_agent</code> instruction on-chain.
        </li>
        <li>
          The dashboard receives SSE events (<code>verdict</code>,{' '}
          <code>agent_paused</code>, <code>report_ready</code>) and updates the
          UI in real time &mdash; activity feeds, spend gauges, and incident
          timelines all reflect the latest state.
        </li>
      </ol>

      <h2>Sponsor Integrations</h2>

      <table>
        <thead>
          <tr>
            <th>Sponsor</th>
            <th>Integration</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Swig</strong></td>
            <td>Session key provisioning &mdash; agents receive scoped session keys with time-limited authority, reducing blast radius of key compromise</td>
          </tr>
          <tr>
            <td><strong>Squads v4</strong></td>
            <td>Multisig escalation &mdash; high-severity incidents trigger a Squads proposal requiring multiple signers before the agent can be resumed</td>
          </tr>
          <tr>
            <td><strong>Helius</strong></td>
            <td>Webhook ingestion + enhanced RPC &mdash; real-time transaction monitoring with parsed instruction data and priority fee support</td>
          </tr>
          <tr>
            <td><strong>SendAI / Solana Agent Kit</strong></td>
            <td>Demo agents &mdash; the Yield Bot and Staking Agent used in the live demo are built with Solana Agent Kit</td>
          </tr>
        </tbody>
      </table>

      <h2>SDK Sync</h2>

      <p>
        The <code>sdk/</code> directory at the repository root is the sole source
        of truth for the TypeScript client and Anchor IDL. Two consumers maintain
        local copies:
      </p>

      <ul>
        <li>
          <code>server/src/sdk/</code> &mdash; used by the Express server for
          on-chain interactions
        </li>
        <li>
          <code>dashboard/lib/sdk/</code> &mdash; used by the Next.js dashboard
          for wallet transactions
        </li>
      </ul>

      <p>
        Running <code>bash scripts/sync-sdk.sh</code> copies the latest SDK to
        both consumers. A pre-commit hook automatically runs the sync whenever
        files in <code>sdk/</code> or <code>program/</code> are staged, and CI
        fails if the copies are out of sync.
      </p>

      <Callout type="warning">
        Never edit files inside <code>server/src/sdk/</code> or{' '}
        <code>dashboard/lib/sdk/</code> directly. Always edit{' '}
        <code>sdk/</code> at the repository root and run the sync script.
      </Callout>
    </Prose>
  )
}
