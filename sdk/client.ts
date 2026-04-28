// client.ts — GuardrailsClient class wrapping the Anchor program client.
// Source of truth — synced to server/src/sdk/ and dashboard/lib/sdk/.
//
// Usage:
//   const client = new GuardrailsClient(provider);
//   const policy = await client.fetchPolicy(policyPda);
//   await client.pauseAgent(policyPda, "Anomaly detected");

import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";
import { AccountMeta, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import IDL from "./idl/guardrails.json";
import {
  POLICY_SEED,
  TRACKER_SEED,
  type PermissionPolicy,
  type SpendTracker,
  type InitializePolicyArgs,
  type UpdatePolicyArgs,
  type GuardedExecuteArgs,
  type WrapSolArgs,
} from "./types";

const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

const PAUSE_REASON_MAX_BYTES = 64;

// ---------------------------------------------------------------------------
// Resolve program ID from env vars (server: GUARDRAILS_PROGRAM_ID,
// dashboard: NEXT_PUBLIC_GUARDRAILS_PROGRAM_ID) or require explicit param.
// ---------------------------------------------------------------------------

function getEnvProgramId(): PublicKey | undefined {
  const envId =
    typeof process !== "undefined"
      ? process.env.GUARDRAILS_PROGRAM_ID ??
        process.env.NEXT_PUBLIC_GUARDRAILS_PROGRAM_ID
      : undefined;
  return envId ? new PublicKey(envId) : undefined;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class GuardrailsClient {
  readonly program: Program;
  readonly programId: PublicKey;

  /**
   * @param provider - Anchor provider (wallet + connection)
   * @param programId - Program ID. If omitted, reads from GUARDRAILS_PROGRAM_ID
   *   or NEXT_PUBLIC_GUARDRAILS_PROGRAM_ID env var.
   */
  constructor(provider: AnchorProvider, programId?: PublicKey) {
    const resolved = programId ?? getEnvProgramId();
    if (!resolved) {
      throw new Error(
        "programId required: pass explicitly or set GUARDRAILS_PROGRAM_ID / NEXT_PUBLIC_GUARDRAILS_PROGRAM_ID env var",
      );
    }
    this.programId = resolved;

    // Override the IDL's embedded address with the resolved program ID so
    // the Anchor Program instance and PDA derivation use the same ID.
    // This avoids mismatches when deploying to different clusters.
    const idlWithAddress = { ...IDL, address: resolved.toBase58() };
    this.program = new Program(idlWithAddress as any, provider);
  }

  /** Connected wallet public key (owner, monitor, or agent signer depending on ix). */
  private walletPublicKey(): PublicKey {
    const pk = (this.program.provider as AnchorProvider).wallet?.publicKey;
    if (!pk) {
      throw new Error("Anchor provider wallet is not connected");
    }
    return pk;
  }

  // -------------------------------------------------------------------------
  // PDA derivation
  // -------------------------------------------------------------------------

  /** Derives the PermissionPolicy PDA for an (owner, agent) pair. */
  findPolicyPda(owner: PublicKey, agent: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from(POLICY_SEED),
        owner.toBuffer(),
        agent.toBuffer(),
      ],
      this.programId,
    );
  }

  /** Derives the SpendTracker PDA for a policy. */
  findTrackerPda(policy: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(TRACKER_SEED), policy.toBuffer()],
      this.programId,
    );
  }

  // -------------------------------------------------------------------------
  // Account fetchers
  // -------------------------------------------------------------------------

  /** Fetches a PermissionPolicy account by its PDA address. */
  async fetchPolicy(policyPda: PublicKey): Promise<PermissionPolicy | null> {
    try {
      const account = await (this.program.account as any).permissionPolicy.fetch(policyPda);
      return account as PermissionPolicy;
    } catch {
      return null;
    }
  }

  /** Fetches a SpendTracker account by its PDA address. */
  async fetchTracker(trackerPda: PublicKey): Promise<SpendTracker | null> {
    try {
      const account = await (this.program.account as any).spendTracker.fetch(trackerPda);
      return account as SpendTracker;
    } catch {
      return null;
    }
  }

  /** Derives the policy PDA from (owner, agent), then fetches it. */
  async fetchPolicyByOwnerAgent(
    owner: PublicKey,
    agent: PublicKey,
  ): Promise<PermissionPolicy | null> {
    const [pda] = this.findPolicyPda(owner, agent);
    return this.fetchPolicy(pda);
  }

  // -------------------------------------------------------------------------
  // Instruction methods
  // -------------------------------------------------------------------------

  /**
   * Creates a PermissionPolicy + SpendTracker PDA pair.
   * The provider wallet must be the policy owner (signs as `owner`).
   */
  async initializePolicy(
    agent: PublicKey,
    args: InitializePolicyArgs,
  ): Promise<string> {
    const owner = this.walletPublicKey();
    const [policyPda] = this.findPolicyPda(owner, agent);
    const [trackerPda] = this.findTrackerPda(policyPda);

    return await (this.program.methods as any)
      .initializePolicy(args)
      .accounts({
        owner,
        agent,
        policy: policyPda,
        spendTracker: trackerPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  /** Updates configurable fields on an existing policy. Owner-only (wallet). */
  async updatePolicy(
    policyPda: PublicKey,
    args: UpdatePolicyArgs,
  ): Promise<string> {
    const owner = this.walletPublicKey();
    return await (this.program.methods as any)
      .updatePolicy(args)
      .accounts({
        owner,
        policy: policyPda,
      })
      .rpc();
  }

  /**
   * Executes a guarded CPI through the policy's permission layer.
   *
   * @param agent - The agent session keypair (signs the outer transaction)
   * @param policyPda - The PermissionPolicy PDA
   * @param trackerPda - The SpendTracker PDA
   * @param targetProgram - The program to CPI into
   * @param args - Instruction data + amount hint
   * @param remainingAccounts - CPI accounts (source, dest, authority, target program)
   */
  async guardedExecute(
    agent: Keypair,
    policyPda: PublicKey,
    trackerPda: PublicKey,
    targetProgram: PublicKey,
    args: GuardedExecuteArgs,
    remainingAccounts: AccountMeta[],
  ): Promise<string> {
    return await (this.program.methods as any)
      .guardedExecute(args)
      .accounts({
        agent: agent.publicKey,
        policy: policyPda,
        spendTracker: trackerPda,
        targetProgram,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(remainingAccounts)
      .signers([agent])
      .rpc();
  }

  /**
   * Pauses an agent. Callable by owner or authorized monitor (provider wallet).
   */
  async pauseAgent(
    policyPda: PublicKey,
    reason: string | Buffer,
  ): Promise<string> {
    const caller = this.walletPublicKey();
    const reasonBuf = typeof reason === "string" ? Buffer.from(reason) : reason;
    if (reasonBuf.byteLength > PAUSE_REASON_MAX_BYTES) {
      throw new Error(`Pause reason exceeds ${PAUSE_REASON_MAX_BYTES} bytes`);
    }

    return await (this.program.methods as any)
      .pauseAgent({ reason: reasonBuf })
      .accounts({
        caller,
        policy: policyPda,
      })
      .rpc();
  }

  /**
   * Rotates the agent session key. Closes old policy+tracker PDAs,
   * creates new ones with the new agent key, copies config, and transfers
   * operational SOL atomically. Owner-only (wallet).
   */
  async rotateAgentKey(
    oldPolicyPda: PublicKey,
    newAgent: PublicKey,
  ): Promise<{ txSig: string; newPolicyPda: PublicKey }> {
    const owner = this.walletPublicKey();
    const [oldTrackerPda] = this.findTrackerPda(oldPolicyPda);
    const [newPolicyPda] = this.findPolicyPda(owner, newAgent);
    const [newTrackerPda] = this.findTrackerPda(newPolicyPda);

    const txSig = await (this.program.methods as any)
      .rotateAgentKey({ newAgent })
      .accounts({
        owner,
        oldPolicy: oldPolicyPda,
        oldTracker: oldTrackerPda,
        newAgent,
        newPolicy: newPolicyPda,
        newTracker: newTrackerPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return { txSig, newPolicyPda };
  }

  /**
   * Permanently closes a policy and its tracker. Returns all SOL to owner.
   * Policy must be paused first. Owner-only (wallet).
   */
  async closePolicy(policyPda: PublicKey): Promise<string> {
    const owner = this.walletPublicKey();
    const [trackerPda] = this.findTrackerPda(policyPda);
    return await (this.program.methods as any)
      .closePolicy()
      .accounts({
        owner,
        policy: policyPda,
        tracker: trackerPda,
      })
      .rpc();
  }

  /** Resumes a paused agent. Owner-only (wallet). */
  async resumeAgent(policyPda: PublicKey): Promise<string> {
    const owner = this.walletPublicKey();
    return await (this.program.methods as any)
      .resumeAgent()
      .accounts({
        owner,
        policy: policyPda,
      })
      .rpc();
  }

  /**
   * Wraps native SOL from the policy PDA into wSOL in the PDA's ATA.
   * Callable by owner or agent (callerKeypair must be one of them).
   */
  async wrapSol(
    policyPda: PublicKey,
    wsolAta: PublicKey,
    args: WrapSolArgs,
    callerKeypair: Keypair,
  ): Promise<string> {
    return await (this.program.methods as any)
      .wrapSol(args)
      .accounts({
        caller: callerKeypair.publicKey,
        policy: policyPda,
        wsolAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([callerKeypair])
      .rpc();
  }

  /**
   * Unwraps wSOL back to native SOL on the policy PDA by closing the ATA.
   * Callable by owner or agent.
   */
  async unwrapSol(
    policyPda: PublicKey,
    wsolAta: PublicKey,
    callerKeypair: Keypair,
  ): Promise<string> {
    return await (this.program.methods as any)
      .unwrapSol()
      .accounts({
        caller: callerKeypair.publicKey,
        policy: policyPda,
        wsolAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([callerKeypair])
      .rpc();
  }
}
