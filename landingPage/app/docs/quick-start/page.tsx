import Prose from '../../components/docs/prose'
import CodeBlock from '../../components/docs/code-block'
import Callout from '../../components/docs/callout'

export default function QuickStartPage() {
  return (
    <Prose>
      <h1>Quick Start</h1>

      <p>
        Get from zero to a working guarded agent in under 10 minutes.
      </p>

      <h2>Prerequisites</h2>

      <ul>
        <li>Rust 1.75+ (<code>rustc --version</code>)</li>
        <li>Solana CLI 1.18+ (<code>solana --version</code>)</li>
        <li>Anchor CLI 0.30.1 (<code>anchor --version</code>)</li>
        <li>Node.js 20+ (<code>node --version</code>)</li>
        <li>pnpm 9+ (<code>pnpm --version</code>)</li>
      </ul>

      <h2>1. Clone &amp; Setup</h2>

      <CodeBlock filename="terminal">
{`git clone https://github.com/AgentGuards/agent-guardrails.git
cd agent-guardrails
git config core.hooksPath .githooks`}
      </CodeBlock>

      <h2>2. Build the Program</h2>

      <CodeBlock filename="terminal">
{`cd program
anchor build
bash ../scripts/sync-sdk.sh`}
      </CodeBlock>

      <Callout type="tip">
        The sync script copies the IDL and TypeScript client to server/ and
        dashboard/.
      </Callout>

      <h2>3. Deploy to Devnet</h2>

      <CodeBlock filename="terminal">
{`solana config set --url devnet
solana airdrop 5
cd program
anchor deploy --provider.cluster devnet`}
      </CodeBlock>

      <p>
        Copy the program ID from the output. You will need it when configuring
        the server and dashboard environment variables.
      </p>

      <h2>4. Create Your First Policy</h2>

      <CodeBlock filename="create-policy.ts">
{`import { GuardrailsClient } from '@agent-guardrails/sdk';
import { AnchorProvider } from '@coral-xyz/anchor';
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';

const provider = AnchorProvider.env();
const client = new GuardrailsClient(provider);

// Generate an agent session key
const agentKeypair = Keypair.generate();

// Create a policy
const txSig = await client.initializePolicy(agentKeypair.publicKey, {
  allowedPrograms: [
    new PublicKey('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'), // Jupiter
    new PublicKey('11111111111111111111111111111111'),              // System Program
  ],
  maxTxLamports: BigInt(2 * LAMPORTS_PER_SOL),      // 2 SOL per tx
  maxTxTokenUnits: BigInt(0),
  dailyBudgetLamports: BigInt(20 * LAMPORTS_PER_SOL), // 20 SOL daily
  sessionExpiry: BigInt(Math.floor(Date.now() / 1000) + 86400 * 30), // 30 days
  squadsMultisig: null,
  escalationThreshold: BigInt(0),
  authorizedMonitors: [],
});

console.log('Policy created:', txSig);`}
      </CodeBlock>

      <h2>5. Fund the Policy PDA</h2>

      <p>
        Funds must be deposited to the policy PDA, not the agent keypair. The
        agent is only an authorized signer &mdash; the policy PDA holds all SOL
        and enforces spending constraints.
      </p>

      <CodeBlock filename="fund-policy.ts">
{`const [policyPda] = client.findPolicyPda(provider.wallet.publicKey, agentKeypair.publicKey);

// Transfer SOL to policy PDA
const tx = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: provider.wallet.publicKey,
    toPubkey: policyPda,
    lamports: 10 * LAMPORTS_PER_SOL,
  })
);
await provider.sendAndConfirm(tx);`}
      </CodeBlock>

      <h2>6. Execute a Guarded Transaction</h2>

      <CodeBlock filename="guarded-execute.ts">
{`const [policyPda] = client.findPolicyPda(owner, agentKeypair.publicKey);
const [trackerPda] = client.findTrackerPda(policyPda);

const txSig = await client.guardedExecute(
  agentKeypair,
  policyPda,
  trackerPda,
  SystemProgram.programId,
  {
    instructionData: Buffer.from([2, 0, 0, 0, ...]), // transfer ix
    amountHint: BigInt(1 * LAMPORTS_PER_SOL),
    inputAccountIndex: null,
  },
  [{ pubkey: destinationPubkey, isSigner: false, isWritable: true }]
);`}
      </CodeBlock>

      <h2>Next Steps</h2>

      <ul>
        <li>
          <a href="/docs/deployment">Set up the server for monitoring</a>
        </li>
        <li>
          <a href="/docs/dashboard-guide">Explore the dashboard</a>
        </li>
        <li>
          <a href="/docs/monitoring-pipeline">
            Learn about the monitoring pipeline
          </a>
        </li>
      </ul>
    </Prose>
  )
}
