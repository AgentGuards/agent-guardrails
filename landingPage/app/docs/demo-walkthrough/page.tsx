import Prose from '../../components/docs/prose'
import CodeBlock from '../../components/docs/code-block'
import Callout from '../../components/docs/callout'

export default function DemoWalkthroughPage() {
  return (
    <Prose>
      <h1>Demo Walkthrough</h1>

      <p>
        This is a 3-minute live demo showing three AI agents operating on Solana
        devnet. Two agents behave normally. One goes rogue and attempts to drain its
        treasury. Agent Guardrails detects the attack, freezes the agent on-chain,
        and generates a full incident report &mdash; all in under 3 seconds.
      </p>

      <h2>Setup</h2>

      <p>
        The demo runs three agents simultaneously, each with its own policy and
        behavioral pattern:
      </p>

      <ul>
        <li>
          <strong>Yield Bot</strong> &mdash; an honest agent that performs Jupiter
          swaps every ~15 seconds. Small, consistent amounts within its budget.
        </li>
        <li>
          <strong>Staking Agent</strong> &mdash; an honest agent that performs
          Marinade stakes every ~20 seconds. Moderate amounts, predictable pattern.
        </li>
        <li>
          <strong>Alpha Scanner</strong> &mdash; a compromised agent that begins
          normally, then attempts a rapid treasury drain by targeting unknown
          programs with escalating amounts.
        </li>
      </ul>

      <h2>Pre-Demo Checklist</h2>

      <ol>
        <li>Devnet program deployed and program ID updated in environment variables</li>
        <li>Server running with <code>MONITOR_KEYPAIR</code> funded (at least 0.5 SOL for pause transactions)</li>
        <li>Dashboard connected to the server and displaying the agent list</li>
        <li>Helius webhook configured to POST to the server&#39;s <code>/webhook</code> endpoint</li>
        <li>Demo policy created by running <code>npm run demo:setup</code> in the dashboard directory</li>
      </ol>

      <h2>Timeline</h2>

      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Agent</th>
            <th>Action</th>
            <th>Verdict</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>T+0s</td>
            <td>Yield Bot</td>
            <td>Jupiter swap 1.2 SOL</td>
            <td>ALLOW</td>
          </tr>
          <tr>
            <td>T+15s</td>
            <td>Staking Agent</td>
            <td>Marinade stake 3.0 SOL</td>
            <td>ALLOW</td>
          </tr>
          <tr>
            <td>T+30s</td>
            <td>Yield Bot</td>
            <td>Jupiter swap 0.8 SOL</td>
            <td>ALLOW</td>
          </tr>
          <tr>
            <td>T+45s</td>
            <td>Yield Bot</td>
            <td>Jupiter swap 1.5 SOL</td>
            <td>ALLOW</td>
          </tr>
          <tr>
            <td>T+60s</td>
            <td>Alpha Scanner</td>
            <td>Unknown program 4.8 SOL</td>
            <td>FLAG (68%)</td>
          </tr>
          <tr>
            <td>T+61s</td>
            <td>Alpha Scanner</td>
            <td>Burst 3tx/4s 2.1 SOL</td>
            <td>FLAG (76%)</td>
          </tr>
          <tr>
            <td>T+62s</td>
            <td>Alpha Scanner</td>
            <td>Drain sequence 8.2 SOL</td>
            <td>PAUSE (94%)</td>
          </tr>
          <tr>
            <td>T+62s</td>
            <td>(system)</td>
            <td>AGENT FROZEN ON-CHAIN</td>
            <td>&mdash;</td>
          </tr>
          <tr>
            <td>T+65s</td>
            <td>(system)</td>
            <td>Incident report generated</td>
            <td>&mdash;</td>
          </tr>
        </tbody>
      </table>

      <h2>Phase by Phase</h2>

      <h3>Phase 1: Normal Operations (T+0s to T+55s)</h3>

      <p>
        Yield Bot and Staking Agent perform their routine operations. Every
        transaction passes through <code>guarded_execute</code>, is validated
        on-chain (programs are whitelisted, amounts are within budget), and receives
        an <code>ALLOW</code> verdict from the Prefilter (no signals detected, so the
        Judge is never called). In the dashboard, all transactions appear with green
        status badges and the spend gauges tick up gradually.
      </p>

      <h3>Phase 2: Attack Begins (T+60s to T+62s)</h3>

      <p>
        Alpha Scanner starts its drain sequence. Three signals fire in rapid
        succession:
      </p>

      <ul>
        <li>
          <strong><code>program_not_whitelisted</code></strong> &mdash; the first
          transaction targets a program not in the policy&#39;s allow-list
        </li>
        <li>
          <strong><code>burst_detected</code></strong> &mdash; three transactions
          in four seconds far exceeds normal frequency
        </li>
        <li>
          <strong><code>consecutive_high_amounts</code></strong> &mdash;
          escalating amounts (4.8, 2.1, 8.2 SOL) with the final transaction at
          8.2 SOL approaching the per-transaction cap
        </li>
      </ul>

      <p>
        The first two transactions are forwarded to the Guardian Agent judge and
        receive <code>FLAG</code> verdicts with escalating confidence. The dashboard
        shows amber warning badges. By the third transaction, the combined signal
        weight triggers a <code>PAUSE</code> verdict at 94% confidence.
      </p>

      <h3>Phase 3: Kill Switch (T+62s)</h3>

      <p>
        The Executor stage immediately signs a <code>pause_agent</code> instruction
        with the <code>MONITOR_KEYPAIR</code> and submits it on-chain. The policy
        PDA&#39;s <code>paused</code> flag is set to <code>true</code>. From this
        moment, every subsequent <code>guarded_execute</code> call for Alpha Scanner
        is rejected at the program level with an <code>AgentPaused</code> error. The
        dashboard shows a red &ldquo;PAUSED&rdquo; badge and the kill switch button
        is replaced with a &ldquo;Resume&rdquo; option (which requires the owner&#39;s
        signature).
      </p>

      <h3>Phase 4: Incident Report (T+65s)</h3>

      <p>
        The Reporter stage runs asynchronously. It fetches Alpha Scanner&#39;s full
        transaction history, feeds it to the Guardian Agent with a report-generation
        prompt, and produces a markdown postmortem containing:
      </p>

      <ul>
        <li>Executive summary of the incident</li>
        <li>Timeline table showing every transaction with timestamps and verdicts</li>
        <li>Anomaly signals detected and their severity</li>
        <li>Root cause analysis (compromised key, unauthorized program targeting)</li>
        <li>Recommended next steps (rotate session key, review allow-list, audit agent code)</li>
      </ul>

      <p>
        The dashboard receives a <code>report_ready</code> SSE event and displays the
        full report in the incident detail view.
      </p>

      <h2>Why the Agent Can&#39;t Escape</h2>

      <p>
        Six layers of protection ensure that even a fully compromised agent cannot
        drain its treasury:
      </p>

      <ol>
        <li>
          <strong>Funds live in the PDA, not the agent keypair.</strong> The agent
          can only access funds through <code>guarded_execute</code>, which
          enforces all policy constraints.
        </li>
        <li>
          <strong>Every CPI goes through <code>guarded_execute</code>.</strong>{' '}
          There is no way to bypass the on-chain validation. The agent&#39;s
          keypair is an authorized signer, not a fund holder.
        </li>
        <li>
          <strong>On-chain whitelist blocks unknown programs.</strong> Even before
          the off-chain pipeline sees the transaction, the program rejects CPIs to
          non-whitelisted programs.
        </li>
        <li>
          <strong>Budget caps prevent drain even if one transaction sneaks
          through.</strong> Per-transaction caps limit the maximum single outflow,
          and daily budgets limit cumulative spend.
        </li>
        <li>
          <strong>AI monitors behavioral patterns, not just rules.</strong> The
          Guardian Agent detects anomalies that rule-based systems miss: unusual
          timing, burst patterns, escalating amounts, and behavioral shifts.
        </li>
        <li>
          <strong>Pause is on-chain and immediate.</strong> Once the{' '}
          <code>paused</code> flag is set on the policy PDA, the Solana runtime
          enforces it. The agent cannot un-pause itself &mdash; only the policy
          owner (or a multisig via Squads) can resume.
        </li>
      </ol>

      <h2>Running the Demo</h2>

      <CodeBlock filename="terminal">
{`npm run demo:setup    # Create demo policy on devnet
npm run demo:simulate  # Run the full attack simulation`}
      </CodeBlock>

      <p>
        Run these commands from the <code>dashboard/</code> directory. The setup
        script creates the policy accounts on devnet and funds the demo agents. The
        simulate script runs all three agents concurrently and triggers the attack
        sequence at the configured time.
      </p>

      <Callout type="warning">
        Ensure your devnet wallet has at least 5 SOL for demo operations. You can
        request an airdrop with <code>solana airdrop 5 --url devnet</code>.
      </Callout>
    </Prose>
  )
}
