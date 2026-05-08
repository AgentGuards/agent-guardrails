import Prose from '../../components/docs/prose'
import CodeBlock from '../../components/docs/code-block'
import Callout from '../../components/docs/callout'

export default function SdkReferencePage() {
  return (
    <Prose>
      <h1>SDK Reference</h1>

      <p>
        TypeScript client for interacting with the Agent Guardrails on-chain
        program. The SDK wraps every instruction, handles PDA derivation, and
        provides typed helpers for policy management, guarded execution, and
        kill switch operations.
      </p>

      <h2>Installation</h2>

      <CodeBlock filename="terminal">
        {'npm install @agentguards/sdk'}
      </CodeBlock>

      <h2>Initialization</h2>

      <CodeBlock filename="client.ts">
        {`import { GuardrailsClient } from "@agentguards/sdk";
import { AnchorProvider } from "@coral-xyz/anchor";

const provider = AnchorProvider.env();
const client = new GuardrailsClient(provider);`}
      </CodeBlock>

      <h2>PDA Derivation</h2>

      <p>
        The SDK provides two helpers that derive program-derived addresses used
        by all instructions. These mirror the seeds defined in the on-chain
        program.
      </p>

      <CodeBlock filename="pda.ts">
        {`import { findPolicyPda, findTrackerPda } from "@agentguards/sdk";

// Seeds: ["policy", owner, agent]
const [policyPda, policyBump] = findPolicyPda(ownerPubkey, agentPubkey);

// Seeds: ["tracker", policy]
const [trackerPda, trackerBump] = findTrackerPda(policyPda);`}
      </CodeBlock>

      <h2>Policy Management</h2>

      <h3>initializePolicy</h3>

      <p>
        Creates a new <code>PermissionPolicy</code> account and its associated{' '}
        <code>SpendTracker</code>. The caller (wallet) becomes the policy owner.
      </p>

      <table>
        <thead>
          <tr>
            <th>Param</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>agent</code></td>
            <td>PublicKey</td>
            <td>Public key of the AI agent keypair</td>
          </tr>
          <tr>
            <td><code>args</code></td>
            <td>InitializePolicyArgs</td>
            <td>Policy configuration object (see below)</td>
          </tr>
        </tbody>
      </table>

      <p><strong>InitializePolicyArgs fields:</strong></p>

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
            <td><code>allowedPrograms</code></td>
            <td>Pubkey[]</td>
            <td>Whitelisted program IDs (max 10)</td>
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
            <td>Rolling 24h budget in lamports</td>
          </tr>
          <tr>
            <td><code>sessionExpiry</code></td>
            <td>i64</td>
            <td>Unix timestamp when the session expires</td>
          </tr>
          <tr>
            <td><code>squadsMultisig</code></td>
            <td>Option&lt;Pubkey&gt;</td>
            <td>Squads v4 multisig for escalation (optional)</td>
          </tr>
          <tr>
            <td><code>escalationThreshold</code></td>
            <td>u64</td>
            <td>Amount that triggers multisig escalation</td>
          </tr>
          <tr>
            <td><code>authorizedMonitors</code></td>
            <td>Pubkey[]</td>
            <td>Keypairs allowed to pause the agent (max 3)</td>
          </tr>
        </tbody>
      </table>

      <p>Returns the transaction signature.</p>

      <CodeBlock filename="init-policy.ts">
        {`const txSig = await client.initializePolicy(agentKeypair.publicKey, {
  allowedPrograms: [JUPITER_PROGRAM_ID, MARINADE_PROGRAM_ID],
  maxTxLamports: new BN(500_000_000),     // 0.5 SOL
  maxTxTokenUnits: new BN(1_000_000),
  dailyBudgetLamports: new BN(5_000_000_000), // 5 SOL
  sessionExpiry: new BN(Math.floor(Date.now() / 1000) + 86400),
  squadsMultisig: null,
  escalationThreshold: new BN(2_000_000_000), // 2 SOL
  authorizedMonitors: [monitorKeypair.publicKey],
});`}
      </CodeBlock>

      <h3>updatePolicy</h3>

      <p>
        Modifies an existing policy. All fields are optional &mdash; only
        provided fields are updated.
      </p>

      <table>
        <thead>
          <tr>
            <th>Param</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>policyPda</code></td>
            <td>PublicKey</td>
            <td>Address of the PermissionPolicy account</td>
          </tr>
          <tr>
            <td><code>args</code></td>
            <td>UpdatePolicyArgs</td>
            <td>Partial policy update (all fields optional)</td>
          </tr>
        </tbody>
      </table>

      <CodeBlock filename="update-policy.ts">
        {`await client.updatePolicy(policyPda, {
  maxTxLamports: new BN(1_000_000_000),   // raise to 1 SOL
  allowedPrograms: [JUPITER_PROGRAM_ID, MARINADE_PROGRAM_ID, DRIFT_PROGRAM_ID],
});`}
      </CodeBlock>

      <h3>closePolicy</h3>

      <p>
        Permanently deletes a policy and its tracker. The policy must be paused
        first. Only the owner can close. Remaining lamports are refunded to the
        owner.
      </p>

      <CodeBlock filename="close-policy.ts">
        {`const txSig = await client.closePolicy(policyPda);`}
      </CodeBlock>

      <h2>Execution</h2>

      <h3>guardedExecute</h3>

      <p>
        The core instruction. Routes an agent transaction through the 12-step
        validation pipeline before executing the CPI. This is the only way an
        agent should interact with external programs.
      </p>

      <table>
        <thead>
          <tr>
            <th>Param</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>agent</code></td>
            <td>Keypair</td>
            <td>Agent keypair (must match policy)</td>
          </tr>
          <tr>
            <td><code>policyPda</code></td>
            <td>PublicKey</td>
            <td>The PermissionPolicy PDA</td>
          </tr>
          <tr>
            <td><code>trackerPda</code></td>
            <td>PublicKey</td>
            <td>The SpendTracker PDA</td>
          </tr>
          <tr>
            <td><code>targetProgram</code></td>
            <td>PublicKey</td>
            <td>Program to invoke via CPI</td>
          </tr>
          <tr>
            <td><code>args</code></td>
            <td>GuardedExecuteArgs</td>
            <td>Instruction data, amount hint, and optional input account index</td>
          </tr>
          <tr>
            <td><code>remainingAccounts</code></td>
            <td>AccountMeta[]</td>
            <td>Accounts required by the target program</td>
          </tr>
        </tbody>
      </table>

      <CodeBlock filename="guarded-execute.ts">
        {`// Example: Jupiter swap through guarded execution
const txSig = await client.guardedExecute(
  agentKeypair,
  policyPda,
  trackerPda,
  JUPITER_PROGRAM_ID,
  {
    instructionData: swapIxData,
    amountHint: new BN(100_000_000), // 0.1 SOL
    inputAccountIndex: 2,
  },
  jupiterAccounts, // remaining accounts for the swap CPI
);`}
      </CodeBlock>

      <h3>multisigExecute</h3>

      <p>
        Executes a transaction that has been approved by the Squads multisig.
        Used when an agent transaction exceeds the escalation threshold and
        requires human approval.
      </p>

      <table>
        <thead>
          <tr>
            <th>Param</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>squadsProposal</code></td>
            <td>PublicKey</td>
            <td>Squads v4 proposal account (must be in Approved state)</td>
          </tr>
        </tbody>
      </table>

      <Callout type="info">
        All other parameters are identical to <code>guardedExecute</code>. The
        multisig proposal serves as the authorization that replaces the standard
        budget check.
      </Callout>

      <CodeBlock filename="multisig-execute.ts">
        {`const txSig = await client.multisigExecute(
  agentKeypair,
  policyPda,
  trackerPda,
  JUPITER_PROGRAM_ID,
  {
    instructionData: swapIxData,
    amountHint: new BN(3_000_000_000), // 3 SOL (above threshold)
    inputAccountIndex: 2,
  },
  jupiterAccounts,
  squadsProposalPda,
);`}
      </CodeBlock>

      <h2>Kill Switch</h2>

      <p>
        The kill switch immediately freezes all agent activity by setting{' '}
        <code>isActive = false</code> on the policy account. Any subsequent
        call to <code>guarded_execute</code> will fail with{' '}
        <code>PolicyPaused</code>.
      </p>

      <CodeBlock filename="kill-switch.ts">
        {`// Pause — callable by owner or any authorized monitor
const pauseTx = await client.pauseAgent(policyPda, "Anomalous transfer pattern detected");

// Resume — owner only
const resumeTx = await client.resumeAgent(policyPda);`}
      </CodeBlock>

      <Callout type="warning">
        <code>pauseAgent</code> can be called by the policy owner or any of
        the <code>authorizedMonitors</code>. <code>resumeAgent</code> is
        restricted to the owner only.
      </Callout>

      <h2>Key Rotation</h2>

      <p>
        Atomically swaps the agent keypair associated with a policy. Creates
        new PDAs under the new agent key, copies all configuration and budget
        state, transfers remaining funds, and closes the old accounts.
      </p>

      <CodeBlock filename="rotate-key.ts">
        {`const { txSig, newPolicyPda } = await client.rotateAgentKey(
  oldPolicyPda,
  newAgentKeypair.publicKey,
);

// Old policy + tracker PDAs are closed
// New policy + tracker PDAs are created with identical config`}
      </CodeBlock>

      <h2>Types</h2>

      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Kind</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>InitializePolicyArgs</code></td>
            <td>Instruction args</td>
            <td>Configuration for creating a new policy (see initializePolicy above)</td>
          </tr>
          <tr>
            <td><code>UpdatePolicyArgs</code></td>
            <td>Instruction args</td>
            <td>Partial update fields (all optional)</td>
          </tr>
          <tr>
            <td><code>GuardedExecuteArgs</code></td>
            <td>Instruction args</td>
            <td>instructionData (Buffer), amountHint (BN), inputAccountIndex (number, optional)</td>
          </tr>
          <tr>
            <td><code>PermissionPolicy</code></td>
            <td>Account struct</td>
            <td>On-chain policy state &mdash; owner, agent, limits, monitors, pause state</td>
          </tr>
          <tr>
            <td><code>SpendTracker</code></td>
            <td>Account struct</td>
            <td>Rolling spend counters &mdash; 24h and 1h windows, transaction counts, destination tracking</td>
          </tr>
        </tbody>
      </table>
    </Prose>
  )
}
