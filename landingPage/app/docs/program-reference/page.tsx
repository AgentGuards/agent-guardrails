import Prose from '../../components/docs/prose'
import Callout from '../../components/docs/callout'

export default function ProgramReferencePage() {
  return (
    <Prose>
      <h1>Program Reference</h1>

      <p>
        Anchor 0.30.1 Solana program that enforces agent policies on-chain.
        Program ID: <code>ENzC6oJhL2bVELvRCZqN4JizFNPTCTfMR5Gz1YJb4u76</code>
      </p>

      <Callout type="info">
        The program is deployed on Solana devnet.
      </Callout>

      <h2>Accounts</h2>

      <h3>PermissionPolicy</h3>

      <p>
        PDA seeds: <code>[&quot;policy&quot;, owner, agent]</code>. Size: 685 bytes.
        Stores all policy configuration, spend state, and pause metadata for a
        single agent.
      </p>

      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>owner</code></td>
            <td>Pubkey</td>
            <td>Wallet that created and controls the policy</td>
          </tr>
          <tr>
            <td><code>agent</code></td>
            <td>Pubkey</td>
            <td>Public key of the AI agent keypair</td>
          </tr>
          <tr>
            <td><code>allowedPrograms</code></td>
            <td>Vec&lt;Pubkey&gt; (max 10)</td>
            <td>Whitelisted program IDs for CPI</td>
          </tr>
          <tr>
            <td><code>maxTxLamports</code></td>
            <td>u64</td>
            <td>Per-transaction SOL cap in lamports</td>
          </tr>
          <tr>
            <td><code>maxTxTokenUnits</code></td>
            <td>u64</td>
            <td>Per-transaction token unit cap</td>
          </tr>
          <tr>
            <td><code>dailyBudgetLamports</code></td>
            <td>u64</td>
            <td>Rolling 24-hour budget in lamports</td>
          </tr>
          <tr>
            <td><code>dailySpentLamports</code></td>
            <td>u64</td>
            <td>Lamports spent in the current 24h window</td>
          </tr>
          <tr>
            <td><code>lastResetTs</code></td>
            <td>i64</td>
            <td>Timestamp of the last budget window reset</td>
          </tr>
          <tr>
            <td><code>sessionExpiry</code></td>
            <td>i64</td>
            <td>Unix timestamp when the agent session expires</td>
          </tr>
          <tr>
            <td><code>isActive</code></td>
            <td>bool</td>
            <td>Whether the agent is active (false when paused)</td>
          </tr>
          <tr>
            <td><code>pausedBy</code></td>
            <td>Option&lt;Pubkey&gt;</td>
            <td>Who triggered the kill switch (if paused)</td>
          </tr>
          <tr>
            <td><code>pausedReason</code></td>
            <td>[u8; 64]</td>
            <td>UTF-8 encoded reason string (if paused)</td>
          </tr>
          <tr>
            <td><code>squadsMultisig</code></td>
            <td>Option&lt;Pubkey&gt;</td>
            <td>Squads v4 multisig address for escalation</td>
          </tr>
          <tr>
            <td><code>escalationThreshold</code></td>
            <td>u64</td>
            <td>Amount in lamports that triggers multisig escalation</td>
          </tr>
          <tr>
            <td><code>authorizedMonitors</code></td>
            <td>Vec&lt;Pubkey&gt; (max 3)</td>
            <td>Keypairs authorized to call pause_agent</td>
          </tr>
          <tr>
            <td><code>anomalyScore</code></td>
            <td>u8</td>
            <td>Guardian Agent anomaly score (0&ndash;100)</td>
          </tr>
          <tr>
            <td><code>bump</code></td>
            <td>u8</td>
            <td>PDA bump seed</td>
          </tr>
        </tbody>
      </table>

      <h3>SpendTracker</h3>

      <p>
        PDA seeds: <code>[&quot;tracker&quot;, policy]</code>. Tracks rolling
        spend counters, transaction frequency, and behavioral signals used by
        the monitoring pipeline.
      </p>

      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>policy</code></td>
            <td>Pubkey</td>
            <td>Associated PermissionPolicy PDA</td>
          </tr>
          <tr>
            <td><code>windowStart</code></td>
            <td>i64</td>
            <td>Start of the current 24h tracking window</td>
          </tr>
          <tr>
            <td><code>txnCount24h</code></td>
            <td>u64</td>
            <td>Total transactions in the current 24h window</td>
          </tr>
          <tr>
            <td><code>lamportsSpent24h</code></td>
            <td>u64</td>
            <td>Total lamports spent in the current 24h window</td>
          </tr>
          <tr>
            <td><code>lastTxnTs</code></td>
            <td>i64</td>
            <td>Timestamp of the most recent transaction</td>
          </tr>
          <tr>
            <td><code>lastTxnProgram</code></td>
            <td>Pubkey</td>
            <td>Target program of the most recent transaction</td>
          </tr>
          <tr>
            <td><code>uniqueDestinations24h</code></td>
            <td>u64</td>
            <td>Unique destination accounts in 24h (heuristic)</td>
          </tr>
          <tr>
            <td><code>maxSingleTxnLamports</code></td>
            <td>u64</td>
            <td>Largest single transaction in the current window</td>
          </tr>
          <tr>
            <td><code>failedTxnCount24h</code></td>
            <td>u64</td>
            <td>Failed guarded_execute attempts in 24h</td>
          </tr>
          <tr>
            <td><code>uniquePrograms24h</code></td>
            <td>u64</td>
            <td>Unique target programs invoked in 24h</td>
          </tr>
          <tr>
            <td><code>lamportsSpent1h</code></td>
            <td>u64</td>
            <td>Lamports spent in the current 1h window</td>
          </tr>
          <tr>
            <td><code>windowStart1h</code></td>
            <td>i64</td>
            <td>Start of the current 1h tracking window</td>
          </tr>
          <tr>
            <td><code>consecutiveHighAmountCount</code></td>
            <td>u64</td>
            <td>Sequential transactions above 50% of per-tx limit</td>
          </tr>
          <tr>
            <td><code>bump</code></td>
            <td>u8</td>
            <td>PDA bump seed</td>
          </tr>
        </tbody>
      </table>

      <h2>Instructions</h2>

      <table>
        <thead>
          <tr>
            <th>Instruction</th>
            <th>Signer</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>initialize_policy</code></td>
            <td>Owner</td>
            <td>Creates policy + tracker PDAs with initial configuration</td>
          </tr>
          <tr>
            <td><code>update_policy</code></td>
            <td>Owner</td>
            <td>Modifies limits, allowed programs, monitors, or multisig settings</td>
          </tr>
          <tr>
            <td><code>guarded_execute</code></td>
            <td>Agent</td>
            <td>Core CPI with 12-step validation pipeline</td>
          </tr>
          <tr>
            <td><code>pause_agent</code></td>
            <td>Owner / Monitor</td>
            <td>Activates the kill switch, freezing all agent activity</td>
          </tr>
          <tr>
            <td><code>resume_agent</code></td>
            <td>Owner only</td>
            <td>Deactivates the kill switch, re-enabling agent execution</td>
          </tr>
          <tr>
            <td><code>rotate_agent_key</code></td>
            <td>Owner</td>
            <td>Swaps agent keypair atomically, migrating all state to new PDAs</td>
          </tr>
          <tr>
            <td><code>close_policy</code></td>
            <td>Owner</td>
            <td>Permanent deletion of policy + tracker, refunds remaining lamports</td>
          </tr>
          <tr>
            <td><code>multisig_execute</code></td>
            <td>Owner</td>
            <td>Squads-approved execution bypassing standard budget checks</td>
          </tr>
          <tr>
            <td><code>escalate_to_squads</code></td>
            <td>&mdash;</td>
            <td>Stub for future Squads proposal creation</td>
          </tr>
          <tr>
            <td><code>update_anomaly_score</code></td>
            <td>Monitor</td>
            <td>Sets the Guardian Agent anomaly score (0&ndash;100)</td>
          </tr>
          <tr>
            <td><code>wrap_sol</code></td>
            <td>Owner / Agent</td>
            <td>Converts SOL to wrapped SOL (wSOL) for SPL interactions</td>
          </tr>
          <tr>
            <td><code>unwrap_sol</code></td>
            <td>Owner / Agent</td>
            <td>Converts wrapped SOL (wSOL) back to native SOL</td>
          </tr>
        </tbody>
      </table>

      <h2>guarded_execute: 12-Step Flow</h2>

      <p>
        Every agent transaction passes through the following validation
        pipeline before the CPI is executed. If any step fails, the
        transaction is rejected and a <code>GuardedTxnRejected</code> event
        is emitted.
      </p>

      <ol>
        <li>Load policy + tracker PDAs and verify account ownership</li>
        <li>Kill switch check &mdash; reject if <code>isActive</code> is false (<code>PolicyPaused</code>)</li>
        <li>Session expiry check &mdash; reject if current timestamp exceeds <code>sessionExpiry</code></li>
        <li>Program whitelist check &mdash; reject if target program is not in <code>allowedPrograms</code></li>
        <li>Amount verification + parsing &mdash; validate <code>amountHint</code> against account balances</li>
        <li>Budget window roll &mdash; reset counters if 24h has elapsed since <code>lastResetTs</code></li>
        <li>Daily budget check &mdash; reject if spend + amount exceeds <code>dailyBudgetLamports</code></li>
        <li>Squads escalation check &mdash; escalate if amount exceeds <code>escalationThreshold</code></li>
        <li>Emit <code>GuardedTxnAttempted</code> event with pre-execution metadata</li>
        <li>Execute CPI via <code>invoke_signed</code> to the target program</li>
        <li>Update spend counters on tracker and emit <code>GuardedTxnExecuted</code></li>
        <li>Return success</li>
      </ol>

      <h2>Events</h2>

      <p>
        The program emits Anchor events that are indexed by Helius webhooks
        and forwarded to the server monitoring pipeline.
      </p>

      <table>
        <thead>
          <tr>
            <th>Event</th>
            <th>Fields</th>
            <th>When Emitted</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>GuardedTxnAttempted</code></td>
            <td>policy, agent, targetProgram, amountHint, timestamp</td>
            <td>Before CPI execution (step 9)</td>
          </tr>
          <tr>
            <td><code>GuardedTxnExecuted</code></td>
            <td>policy, agent, targetProgram, amount, timestamp</td>
            <td>After successful CPI execution (step 11)</td>
          </tr>
          <tr>
            <td><code>GuardedTxnRejected</code></td>
            <td>policy, agent, reason code, timestamp</td>
            <td>On validation failure (steps 2&ndash;8)</td>
          </tr>
          <tr>
            <td><code>AgentPaused</code></td>
            <td>policy, pausedBy, reason, timestamp</td>
            <td>When pause_agent is called</td>
          </tr>
          <tr>
            <td><code>AgentResumed</code></td>
            <td>policy, resumedBy, timestamp</td>
            <td>When resume_agent is called</td>
          </tr>
          <tr>
            <td><code>EscalatedToSquads</code></td>
            <td>policy, squadsProposal, amount</td>
            <td>When transaction exceeds escalation threshold</td>
          </tr>
          <tr>
            <td><code>AgentKeyRotated</code></td>
            <td>oldPolicy, newPolicy, oldAgent, newAgent, timestamp</td>
            <td>When rotate_agent_key completes</td>
          </tr>
          <tr>
            <td><code>MultisigTxnExecuted</code></td>
            <td>policy, owner, targetProgram, amount, squadsProposal, timestamp</td>
            <td>After successful multisig execution</td>
          </tr>
          <tr>
            <td><code>PolicyClosed</code></td>
            <td>policy, owner, refundedLamports, timestamp</td>
            <td>When close_policy completes</td>
          </tr>
        </tbody>
      </table>

      <h2>Error Codes</h2>

      <table>
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>6000</td>
            <td><code>PolicyPaused</code></td>
            <td>Agent is paused by kill switch</td>
          </tr>
          <tr>
            <td>6001</td>
            <td><code>SessionExpired</code></td>
            <td>Agent session has expired</td>
          </tr>
          <tr>
            <td>6002</td>
            <td><code>ProgramNotWhitelisted</code></td>
            <td>Target program is not in the allow list</td>
          </tr>
          <tr>
            <td>6003</td>
            <td><code>AmountExceedsLimit</code></td>
            <td>Transaction amount exceeds per-tx limit</td>
          </tr>
          <tr>
            <td>6004</td>
            <td><code>DailyBudgetExceeded</code></td>
            <td>Daily spending budget has been exhausted</td>
          </tr>
          <tr>
            <td>6005</td>
            <td><code>UnauthorizedPauser</code></td>
            <td>Signer is not authorized to pause this agent</td>
          </tr>
          <tr>
            <td>6006</td>
            <td><code>ResumeRequiresOwner</code></td>
            <td>Only the policy owner can resume an agent</td>
          </tr>
          <tr>
            <td>6007</td>
            <td><code>EscalatedToMultisig</code></td>
            <td>Transaction requires multisig approval</td>
          </tr>
          <tr>
            <td>6008</td>
            <td><code>TooManyAllowedPrograms</code></td>
            <td>Allowed programs list exceeds maximum of 10</td>
          </tr>
          <tr>
            <td>6009</td>
            <td><code>TooManyMonitors</code></td>
            <td>Authorized monitors list exceeds maximum of 3</td>
          </tr>
          <tr>
            <td>6010</td>
            <td><code>SessionExpiryInPast</code></td>
            <td>Session expiry timestamp is in the past</td>
          </tr>
          <tr>
            <td>6011</td>
            <td><code>TxLimitExceedsDailyBudget</code></td>
            <td>Per-tx limit cannot exceed daily budget</td>
          </tr>
          <tr>
            <td>6012</td>
            <td><code>AmountMismatch</code></td>
            <td>Amount hint does not match actual account delta</td>
          </tr>
          <tr>
            <td>6013</td>
            <td><code>CpiExecutionFailed</code></td>
            <td>Cross-program invocation returned an error</td>
          </tr>
          <tr>
            <td>6014</td>
            <td><code>InsufficientLamports</code></td>
            <td>Insufficient lamports for the transaction</td>
          </tr>
          <tr>
            <td>6015</td>
            <td><code>UnauthorizedCaller</code></td>
            <td>Signer is not the expected owner or agent</td>
          </tr>
          <tr>
            <td>6016</td>
            <td><code>InvalidWsolAccount</code></td>
            <td>wSOL account does not match expected address</td>
          </tr>
          <tr>
            <td>6017</td>
            <td><code>InvalidInputAccountIndex</code></td>
            <td>Input account index is out of bounds</td>
          </tr>
          <tr>
            <td>6018</td>
            <td><code>InputAccountIndexRequired</code></td>
            <td>Input account index is required for this instruction</td>
          </tr>
          <tr>
            <td>6019</td>
            <td><code>PolicyNotPaused</code></td>
            <td>Policy must be paused before this action</td>
          </tr>
          <tr>
            <td>6020</td>
            <td><code>NotYetImplemented</code></td>
            <td>This feature is not yet implemented</td>
          </tr>
          <tr>
            <td>6021</td>
            <td><code>SameAgentKey</code></td>
            <td>New agent key must differ from the current key</td>
          </tr>
          <tr>
            <td>6022</td>
            <td><code>InvalidSquadsProposal</code></td>
            <td>Squads proposal account is invalid</td>
          </tr>
          <tr>
            <td>6023</td>
            <td><code>MultisigMismatch</code></td>
            <td>Proposal multisig does not match policy multisig</td>
          </tr>
          <tr>
            <td>6024</td>
            <td><code>ProposalNotApproved</code></td>
            <td>Squads proposal has not been approved</td>
          </tr>
          <tr>
            <td>6025</td>
            <td><code>NoMultisigConfigured</code></td>
            <td>No multisig is configured on this policy</td>
          </tr>
        </tbody>
      </table>
    </Prose>
  )
}
