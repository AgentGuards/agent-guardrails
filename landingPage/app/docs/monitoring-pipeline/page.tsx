import Prose from '../../components/docs/prose'
import CodeBlock from '../../components/docs/code-block'
import Callout from '../../components/docs/callout'

export default function MonitoringPipelinePage() {
  return (
    <Prose>
      <h1>Monitoring Pipeline</h1>

      <p>
        Every agent transaction passes through a 5-stage server-side pipeline that
        detects anomalies, evaluates threats with an AI judge, and can freeze a
        compromised agent on-chain in under 3 seconds. The pipeline runs in sequence
        per transaction but handles concurrent transactions in parallel.
      </p>

      <h2>Pipeline Overview</h2>

      <CodeBlock>
{`Webhook -> Ingest -> Prefilter -> Judge -> Executor -> Reporter`}
      </CodeBlock>

      <p>
        Each stage has a single responsibility and passes its output to the next.
        Transactions that pass the Prefilter with no signals are auto-allowed and
        skip the Judge entirely, keeping costs low for normal operations.
      </p>

      <h2>Stage 1: Ingest</h2>

      <p>
        The Ingest stage receives Helius webhook payloads and transforms them into
        structured transaction records.
      </p>

      <ul>
        <li>
          <strong>Webhook parsing</strong> &mdash; validates the{' '}
          <code>HELIUS_WEBHOOK_SECRET</code> header, extracts the transaction
          signature, and parses the enriched transaction data.
        </li>
        <li>
          <strong>Instruction detection</strong> &mdash; identifies{' '}
          <code>guarded_execute</code> calls by matching the Anchor 8-byte
          discriminator against known instruction hashes.
        </li>
        <li>
          <strong>Event extraction</strong> &mdash; pulls <code>GuardedExecute</code>{' '}
          event data from the transaction logs, including the agent pubkey, target
          program, amount, and instruction data hash.
        </li>
        <li>
          <strong>Database row creation</strong> &mdash; inserts a{' '}
          <code>GuardedTxn</code> row in Postgres with status{' '}
          <code>pending</code> and the extracted fields.
        </li>
        <li>
          <strong>SSE emission</strong> &mdash; pushes a{' '}
          <code>new_transaction</code> event to all connected dashboard clients
          with the full transaction payload.
        </li>
      </ul>

      <h2>Stage 2: Prefilter</h2>

      <p>
        The Prefilter runs 13 cheap statistical checks against the transaction and
        the agent&#39;s recent history. If no signals fire, the transaction is
        auto-allowed (prefilter skip) and does not incur a judge call. Otherwise,
        the signals are attached and the transaction moves to the Judge.
      </p>

      <table>
        <thead>
          <tr>
            <th>Signal</th>
            <th>Condition</th>
            <th>Severity</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>policy_inactive</code></td>
            <td>Policy is paused or expired</td>
            <td>critical</td>
          </tr>
          <tr>
            <td><code>program_not_whitelisted</code></td>
            <td>Target program not in allow-list</td>
            <td>critical</td>
          </tr>
          <tr>
            <td><code>cold_start</code></td>
            <td>Agent has fewer than 5 historical transactions</td>
            <td>low</td>
          </tr>
          <tr>
            <td><code>burst_detected</code></td>
            <td>&gt;= 10 transactions in 60 seconds</td>
            <td>high</td>
          </tr>
          <tr>
            <td><code>elevated_frequency</code></td>
            <td>3&ndash;9 transactions in 60 seconds</td>
            <td>medium</td>
          </tr>
          <tr>
            <td><code>amount_exceeds_cap</code></td>
            <td>Amount exceeds per-transaction cap (&gt;100%)</td>
            <td>critical</td>
          </tr>
          <tr>
            <td><code>high_amount</code></td>
            <td>Amount is 80&ndash;100% of per-transaction cap</td>
            <td>medium</td>
          </tr>
          <tr>
            <td><code>budget_exceeded</code></td>
            <td>Daily spend exceeds budget (&gt;100%)</td>
            <td>critical</td>
          </tr>
          <tr>
            <td><code>budget_nearly_exhausted</code></td>
            <td>Daily spend is 80&ndash;100% of budget</td>
            <td>medium</td>
          </tr>
          <tr>
            <td><code>session_expiring</code></td>
            <td>Session key expires in less than 10 minutes</td>
            <td>low</td>
          </tr>
          <tr>
            <td><code>anomaly_score_elevated</code></td>
            <td>Statistical anomaly score above threshold</td>
            <td>medium</td>
          </tr>
          <tr>
            <td><code>outside_active_hours</code></td>
            <td>Transaction more than 3 hours from median active time</td>
            <td>low</td>
          </tr>
          <tr>
            <td><code>hourly_spend_spike</code></td>
            <td>Last hour spend exceeds 50% of daily budget</td>
            <td>high</td>
          </tr>
          <tr>
            <td><code>consecutive_high_amounts</code></td>
            <td>&gt;= 3 consecutive transactions above 80% of cap</td>
            <td>high</td>
          </tr>
          <tr>
            <td><code>high_failure_rate</code></td>
            <td>More than 30% of recent transactions failed</td>
            <td>medium</td>
          </tr>
          <tr>
            <td><code>max_single_txn_high</code></td>
            <td>Single transaction exceeds 90% of per-transaction cap</td>
            <td>high</td>
          </tr>
        </tbody>
      </table>

      <h2>Stage 3: Judge</h2>

      <p>
        The Guardian Agent evaluates flagged transactions using an LLM with a
        structured system prompt. It receives the full context of the transaction
        and the agent&#39;s recent behavior, and returns a deterministic verdict.
      </p>

      <p>
        <strong>Context provided to the judge:</strong>
      </p>

      <ul>
        <li>Policy limits (allow-list, per-tx cap, daily budget, session window)</li>
        <li>Current transaction details (program, amount, instruction data)</li>
        <li>Last 20 transactions for this agent</li>
        <li>Baseline statistics (average amount, typical frequency, active hours)</li>
        <li>SpendTracker snapshot (current daily spend, transaction count)</li>
        <li>Prefilter signals that triggered the judge call</li>
      </ul>

      <p>
        The judge returns a structured JSON verdict:
      </p>

      <CodeBlock filename="verdict.json">
{`{
  "verdict": "PAUSE",
  "confidence": 94,
  "reasoning": "Burst of 3 transactions in 4 seconds targeting unknown program with escalating amounts suggests automated drain sequence",
  "signals": [
    "program_not_whitelisted",
    "burst_detected",
    "consecutive_high_amounts"
  ]
}`}
      </CodeBlock>

      <p>
        <strong>Fallback behavior:</strong> if the LLM call times out or returns an
        error, the pipeline falls back to rule-based verdicts. Burst signals default
        to <code>FLAG</code> with 60% confidence; all other signals default to{' '}
        <code>FLAG</code> with 50% confidence. This ensures the pipeline never blocks
        on an LLM failure.
      </p>

      <h2>Stage 4: Executor</h2>

      <p>
        When the verdict is <code>PAUSE</code>, the Executor stage takes immediate
        action:
      </p>

      <ol>
        <li>
          Creates an <code>Incident</code> row in Postgres with the verdict,
          signals, and the triggering transaction.
        </li>
        <li>
          Signs a <code>pause_agent</code> instruction using the server&#39;s{' '}
          <code>MONITOR_KEYPAIR</code> and submits it to the Solana network.
        </li>
        <li>
          On success, the on-chain policy&#39;s <code>paused</code> flag is set
          to <code>true</code>. All subsequent <code>guarded_execute</code> calls
          for this agent will be rejected at the program level.
        </li>
        <li>
          Emits an <code>agent_paused</code> SSE event to all connected dashboard
          clients.
        </li>
      </ol>

      <p>
        The on-chain transaction uses a retry strategy of 3 attempts with exponential
        backoff (1s, 2s, 4s). If all retries fail, the incident is marked as{' '}
        <code>pause_failed</code> and an alert is logged for manual intervention.
      </p>

      <h2>Stage 5: Reporter</h2>

      <p>
        The Reporter stage runs asynchronously (fire-and-forget) after the Executor.
        It generates a detailed postmortem for every incident.
      </p>

      <ul>
        <li>
          Fetches the agent&#39;s last 24 hours of transaction history and all
          associated verdicts.
        </li>
        <li>
          Sends the full context to the Guardian Agent with a report-generation
          prompt.
        </li>
        <li>
          Generates a markdown postmortem containing: executive summary, timeline
          table of events, anomaly signals detected, root cause analysis, and
          recommended next steps.
        </li>
        <li>
          Updates the <code>Incident.fullReport</code> field in Postgres.
        </li>
        <li>
          Emits a <code>report_ready</code> SSE event so the dashboard can
          display the report without polling.
        </li>
      </ul>

      <h2>Latency</h2>

      <Callout type="tip">
        Target: less than 3 seconds from first flag to on-chain pause. The Prefilter
        adds approximately 5ms, the Judge call typically completes in 800&ndash;1500ms,
        and the on-chain transaction confirms within 400&ndash;800ms.
      </Callout>

      <h2>Cost Estimates</h2>

      <p>
        Each Guardian Agent judge call costs approximately <strong>$0.0014</strong>{' '}
        (~600 input tokens + ~150 output tokens at current API pricing).
      </p>

      <p>
        With the Prefilter skipping roughly 70% of transactions (normal operations
        produce no signals), the daily cost for a typical agent is:
      </p>

      <ul>
        <li>1,000 daily transactions</li>
        <li>~300 forwarded to the Judge (30% signal rate)</li>
        <li>~300 x $0.0014 = <strong>$0.42 per day</strong></li>
      </ul>

      <p>
        High-volume agents processing 10,000+ daily transactions would see costs
        around $4.20/day, still well below the value protected by the guardrails.
      </p>
    </Prose>
  )
}
