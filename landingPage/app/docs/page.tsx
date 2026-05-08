import Prose from '../components/docs/prose'
import Callout from '../components/docs/callout'

export default function DocsOverview() {
  return (
    <Prose>
      <h1>Agent Guardrails Protocol</h1>

      <p>
        Agent Guardrails is an on-chain policy layer for AI agents operating on Solana.
        It sits between autonomous agents and the blockchain, enforcing allow-lists,
        spending budgets, and a real-time AI kill switch so that operators never lose
        control of their deployed agents.
      </p>

      <p>
        The protocol intercepts every agent transaction through a single entry point
        (<code>guarded_execute</code>), validates it against three layers of defense,
        and can freeze a compromised agent on-chain in under 3 seconds. Funds live in
        a program-derived address controlled by the policy &mdash; never in the agent
        keypair &mdash; so even a fully compromised agent cannot drain its treasury.
      </p>

      <h2>Three Layers of Defense</h2>

      <ul>
        <li>
          <strong>Layer 1: Program Allow-Listing</strong> &mdash; Only whitelisted
          programs (Jupiter, Marinade, Drift, etc.) can be called via CPI. Any
          instruction targeting an unknown program is rejected on-chain before
          execution.
        </li>
        <li>
          <strong>Layer 2: Spending Budgets</strong> &mdash; Per-transaction caps and
          rolling daily budgets enforced on-chain. The <code>SpendTracker</code> PDA
          tallies every outflow and rejects transactions that would exceed limits.
        </li>
        <li>
          <strong>Layer 3: AI Kill Switch (Guardian Agent)</strong> &mdash; An
          off-chain monitoring pipeline analyzes every transaction for behavioral
          anomalies. When the Guardian Agent detects a threat, it signs a{' '}
          <code>pause_agent</code> instruction that freezes the agent on-chain
          immediately.
        </li>
      </ul>

      <h2>Repository Structure</h2>

      <table>
        <thead>
          <tr>
            <th>Directory</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>program/</code></td>
            <td>Anchor 0.30.1 Solana program &mdash; on-chain policy enforcement, guarded execution, and pause/resume instructions</td>
          </tr>
          <tr>
            <td><code>server/</code></td>
            <td>Express API + worker pipeline &mdash; webhook ingestion, Guardian Agent judge, incident reporting, SSE push</td>
          </tr>
          <tr>
            <td><code>dashboard/</code></td>
            <td>Next.js 14 frontend &mdash; real-time monitoring interface with live activity feeds, spend gauges, and incident timelines</td>
          </tr>
          <tr>
            <td><code>sdk/</code></td>
            <td>TypeScript client and IDL &mdash; source of truth, synced to server and dashboard via build script</td>
          </tr>
        </tbody>
      </table>

      <h2>Who It&#39;s For</h2>

      <ul>
        <li>
          <strong>Autonomous agent operators</strong> &mdash; individuals or teams
          deploying AI agents for trading, yield farming, or portfolio rebalancing who
          need guardrails around what those agents can do.
        </li>
        <li>
          <strong>Institutional operators (DAOs, funds)</strong> &mdash; organizations
          that require policy enforcement, audit trails, and multisig escalation
          before any high-value agent action.
        </li>
        <li>
          <strong>AI-native protocols (Jupiter, Marinade, Drift)</strong> &mdash;
          protocols that want to offer agent-friendly integrations with built-in
          safety guarantees for their users.
        </li>
      </ul>

      <h2>Built With</h2>

      <ul>
        <li><strong>Solana</strong> &mdash; high-throughput L1 for sub-second finality</li>
        <li><strong>Anchor 0.30.1</strong> &mdash; Solana program framework for account validation and CPI</li>
        <li><strong>Helius</strong> &mdash; real-time webhooks for transaction monitoring and enhanced RPC</li>
        <li><strong>Squads v4</strong> &mdash; multisig escalation for high-severity incidents</li>
        <li><strong>Guardian Agent</strong> &mdash; LLM-powered anomaly detection and behavioral analysis</li>
        <li><strong>Neon Postgres</strong> &mdash; serverless Postgres for transaction history and incident storage</li>
      </ul>

      <Callout type="info">
        This project was built for the Solana Frontier Hackathon.
      </Callout>

      <h2>Quick Links</h2>

      <ul>
        <li><a href="/docs/quick-start">Quick Start</a> &mdash; get up and running in 5 minutes</li>
        <li><a href="/docs/architecture">Architecture</a> &mdash; system topology and data flow</li>
        <li><a href="/docs/sdk-reference">SDK Reference</a> &mdash; TypeScript client API</li>
        <li><a href="/docs/program-reference">Program Reference</a> &mdash; on-chain instructions and accounts</li>
        <li><a href="/docs/api-reference">API Reference</a> &mdash; server REST endpoints and SSE events</li>
        <li><a href="/docs/demo-walkthrough">Demo Walkthrough</a> &mdash; 3-minute live demo script</li>
      </ul>
    </Prose>
  )
}
