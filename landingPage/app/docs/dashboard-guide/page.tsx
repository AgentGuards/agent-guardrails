import Prose from '../../components/docs/prose'
import Callout from '../../components/docs/callout'

export default function DashboardGuidePage() {
  return (
    <Prose>
      <h1>Dashboard Guide</h1>

      <p>
        The Agent Guardrails dashboard provides real-time visibility and control
        over your autonomous agents.
      </p>

      <h2>Authentication</h2>

      <p>
        The dashboard uses <strong>SIWS (Sign In With Solana)</strong> for
        authentication. Connect your Phantom, Solflare, or Backpack wallet,
        then sign a nonce message to prove ownership. A JWT is issued as an
        httpOnly cookie and all subsequent data is filtered to policies owned
        by your wallet only.
      </p>

      <h2>Fleet Home</h2>

      <p>
        The fleet overview page gives you a snapshot of your entire agent fleet
        at a glance:
      </p>

      <ul>
        <li>
          <strong>Active agent count</strong> &mdash; agents currently running
          with active policies
        </li>
        <li>
          <strong>Paused agent count</strong> &mdash; agents that have been
          frozen by the kill switch or monitoring pipeline
        </li>
        <li>
          <strong>Incidents in last 24h</strong> &mdash; pause events with
          trend indicators
        </li>
        <li>
          <strong>Total SOL spent in 24h</strong> &mdash; aggregate spend
          across all agents
        </li>
      </ul>

      <p>
        Quick access links take you directly to the full agent list or recent
        incidents.
      </p>

      <h2>Creating a Policy</h2>

      <p>
        The 4-step policy creation wizard walks you through configuring a new
        agent policy:
      </p>

      <ol>
        <li>
          <strong>Select Programs</strong> &mdash; choose from Jupiter, Token
          Program, System Program, or enter custom program IDs. Up to 10
          programs can be added to the allow-list.
        </li>
        <li>
          <strong>Set Limits</strong> &mdash; configure the per-transaction SOL
          cap and daily SOL budget. Values are entered in SOL and automatically
          converted to lamports.
        </li>
        <li>
          <strong>Session Expiry</strong> &mdash; set the number of days from
          now until the session key expires. This is converted to a Unix
          timestamp on-chain.
        </li>
        <li>
          <strong>Squads Escalation (optional)</strong> &mdash; configure a
          Squads multisig address and threshold amount. Transactions exceeding
          this threshold are escalated to the multisig for approval.
        </li>
      </ol>

      <h2>Agent Detail Page</h2>

      <p>
        The agent detail page provides comprehensive monitoring for a single
        agent:
      </p>

      <ul>
        <li>
          <strong>Spend Gauge</strong> &mdash; a radial chart showing daily
          SOL spent versus the configured budget
        </li>
        <li>
          <strong>Activity Feed</strong> &mdash; live SSE-updated transaction
          list showing all recent activity
        </li>
        <li>
          <strong>Policy Summary Card</strong> &mdash; displays current limits,
          allowed programs, and status
        </li>
        <li>
          <strong>Controls</strong> &mdash; kill switch, edit policy, rotate
          key, fund agent, and close policy actions
        </li>
      </ul>

      <h2>Kill Switch</h2>

      <p>
        Click the kill switch button to immediately pause an agent. A
        confirmation modal appears, and upon confirming, the dashboard signs a{' '}
        <code>pause_agent</code> instruction on-chain. The agent is frozen
        immediately and cannot execute any further transactions until resumed
        by the policy owner.
      </p>

      <Callout type="warning">
        Pausing an agent is immediate and on-chain. The agent cannot execute
        any further transactions until resumed.
      </Callout>

      <h2>Activity Feed</h2>

      <p>
        The activity feed is a real-time transaction stream powered by
        Server-Sent Events (SSE). Each row displays:
      </p>

      <ul>
        <li><strong>Transaction signature</strong></li>
        <li><strong>Target program</strong></li>
        <li><strong>Amount</strong></li>
        <li>
          <strong>Verdict badge</strong> &mdash;{' '}
          <span style={{ color: '#27c93f' }}>ALLOW</span> (green),{' '}
          <span style={{ color: '#ffbd2e' }}>FLAG</span> (amber),{' '}
          <span style={{ color: '#ff5f56' }}>PAUSE</span> (red)
        </li>
        <li><strong>Confidence score</strong></li>
        <li><strong>Timestamp</strong></li>
      </ul>

      <p>
        Click any row to expand it and view the full verdict reasoning provided
        by the Guardian Agent.
      </p>

      <h2>Incidents</h2>

      <p>
        The incidents page lists all agent pauses across your fleet. Each
        incident shows:
      </p>

      <ul>
        <li><strong>Pause time</strong></li>
        <li>
          <strong>Who paused</strong> &mdash; the policy owner or an authorized
          monitor
        </li>
        <li><strong>Reason</strong> for the pause</li>
        <li><strong>Triggering transaction</strong></li>
      </ul>

      <p>
        Click an incident for the full detail view, which includes:
      </p>

      <ul>
        <li>
          <strong>Incident timeline</strong> &mdash; a vertical timeline of all
          events leading up to and following the pause
        </li>
        <li>
          <strong>Guardian Agent postmortem</strong> &mdash; a detailed markdown
          report generated by the AI judge explaining the anomaly
        </li>
        <li>
          <strong>Judge verdict chain</strong> &mdash; the sequence of verdicts
          that led to the pause decision
        </li>
      </ul>

      <h2>Escalations</h2>

      <p>
        When a transaction exceeds the Squads escalation threshold, the
        following flow occurs:
      </p>

      <ol>
        <li>
          The guardrails program rejects the transaction with an{' '}
          <code>EscalatedToMultisig</code> error
        </li>
        <li>The dashboard shows an escalation notification</li>
        <li>A Squads proposal is created for multisig review</li>
        <li>Multisig members approve the proposal</li>
        <li>
          The transaction is executed via the{' '}
          <code>multisig_execute</code> instruction
        </li>
      </ol>

      <h2>Playground</h2>

      <p>
        The attack simulator is a demo and testing tool for understanding how
        the monitoring pipeline responds to different transaction patterns. In
        the playground you can:
      </p>

      <ul>
        <li>Configure agents with custom policies</li>
        <li>Craft transactions with specific parameters</li>
        <li>Inspect prefilter signals as they fire</li>
        <li>View full verdict reasoning from the Guardian Agent</li>
      </ul>

      <p>
        This is useful for validating your policy configuration before
        deploying to production, and for understanding why specific
        transactions are flagged or paused.
      </p>
    </Prose>
  )
}
