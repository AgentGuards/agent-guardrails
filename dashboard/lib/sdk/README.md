# @agentguards/sdk

TypeScript SDK for the **Agent Guardrails** on-chain policy layer on Solana.

Enforce allow-lists, spending budgets, and real-time kill switches for AI agents interacting with the blockchain.

## Install

```bash
npm install @agentguards/sdk
```

**Peer dependencies:** `@coral-xyz/anchor` (>=0.30) and `@solana/web3.js` (>=1.90)

## Quick Start

```typescript
import { AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { GuardrailsClient } from "@agentguards/sdk";

// Create client
const client = new GuardrailsClient(provider, programId);

// Fetch a policy
const policy = await client.fetchPolicy(policyPda);

// Pause an agent
await client.pauseAgent(policyPda, "Anomaly detected");

// Resume an agent
await client.resumeAgent(policyPda);
```

## API

### `GuardrailsClient`

| Method | Description |
|--------|-------------|
| `initializePolicy(agent, args)` | Create a new policy + spend tracker PDA |
| `updatePolicy(policyPda, args)` | Update policy limits, programs, session |
| `guardedExecute(agent, policyPda, ...)` | Execute a guarded CPI through the policy |
| `pauseAgent(policyPda, reason)` | Pause an agent (kill switch) |
| `resumeAgent(policyPda)` | Resume a paused agent |
| `closePolicy(policyPda)` | Close policy and refund SOL |
| `rotateAgentKey(policyPda, newAgent)` | Rotate agent session key |
| `fetchPolicy(policyPda)` | Fetch on-chain policy account |
| `fetchTracker(trackerPda)` | Fetch on-chain spend tracker |
| `findPolicyPda(owner, agent)` | Derive policy PDA address |
| `findTrackerPda(policyPda)` | Derive tracker PDA address |
| `wrapSol(policyPda, wsolAta, args)` | Wrap SOL to wSOL on policy PDA |
| `unwrapSol(policyPda, wsolAta)` | Unwrap wSOL back to SOL |

### Types

```typescript
import type {
  PermissionPolicy,
  SpendTracker,
  InitializePolicyArgs,
  GuardedExecuteArgs,
} from "@agentguards/sdk/types";
```

### IDL

```typescript
import IDL from "@agentguards/sdk/idl";
```

## Links

- [GitHub](https://github.com/AgentGuards/agent-guardrails)
- [Program docs](https://github.com/AgentGuards/agent-guardrails/blob/main/program/IMPLEMENTATION.md)
