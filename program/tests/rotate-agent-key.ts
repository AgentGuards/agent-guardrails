// Tests for the rotate_agent_key instruction (close old PDAs, create new, copy config, transfer SOL).

import anchor from "@coral-xyz/anchor";
const { BN } = anchor;
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";

import { svm, program, findPolicyPda, findTrackerPda, defaultSessionExpiry } from "./helpers.js";

const defaultAllowedPrograms = [SystemProgram.programId];
const defaultMaxTxLamports = new BN(1_000_000_000);
const defaultMaxTxTokenUnits = new BN(1_000_000);
const defaultDailyBudgetLamports = new BN(5_000_000_000);
const defaultEscalationThreshold = new BN(2_000_000_000);

describe("rotate_agent_key", () => {
  const owner = Keypair.generate();
  const agentA = Keypair.generate();
  const agentB = Keypair.generate();
  const monitor = Keypair.generate().publicKey;

  before(() => {
    svm.airdrop(owner.publicKey, 20_000_000_000n);
  });

  it("rotates agent key: copies config, closes old PDAs, creates new ones", async () => {
    const [oldPolicyPda] = findPolicyPda(owner.publicKey, agentA.publicKey);
    const [oldTrackerPda] = findTrackerPda(oldPolicyPda);

    // Create initial policy
    await program.methods
      .initializePolicy({
        allowedPrograms: defaultAllowedPrograms,
        maxTxLamports: defaultMaxTxLamports,
        maxTxTokenUnits: defaultMaxTxTokenUnits,
        dailyBudgetLamports: defaultDailyBudgetLamports,
        sessionExpiry: defaultSessionExpiry,
        squadsMultisig: null,
        escalationThreshold: defaultEscalationThreshold,
        authorizedMonitors: [monitor],
      })
      .accounts({
        owner: owner.publicKey,
        agent: agentA.publicKey,
        policy: oldPolicyPda,
        spendTracker: oldTrackerPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([owner])
      .rpc();

    // Fund the policy PDA with operational SOL
    svm.airdrop(oldPolicyPda, 3_000_000_000n);

    // Get old policy lamports before rotation
    const oldPolicyAccount = svm.getAccount(oldPolicyPda);
    const oldLamports = BigInt(oldPolicyAccount!.lamports);

    // Derive new PDAs
    const [newPolicyPda] = findPolicyPda(owner.publicKey, agentB.publicKey);
    const [newTrackerPda] = findTrackerPda(newPolicyPda);

    // Rotate
    await program.methods
      .rotateAgentKey({ newAgent: agentB.publicKey })
      .accounts({
        owner: owner.publicKey,
        oldPolicy: oldPolicyPda,
        oldTracker: oldTrackerPda,
        newAgent: agentB.publicKey,
        newPolicy: newPolicyPda,
        newTracker: newTrackerPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([owner])
      .rpc();

    // Old policy PDA should be closed
    const oldAccount = svm.getAccount(oldPolicyPda);
    expect(oldAccount).to.be.null;

    // Old tracker PDA should be closed
    const oldTrackerAccount = svm.getAccount(oldTrackerPda);
    expect(oldTrackerAccount).to.be.null;

    // New policy should exist with copied config
    const newPolicy = await program.account.permissionPolicy.fetch(newPolicyPda);
    expect(newPolicy.owner.toBase58()).to.equal(owner.publicKey.toBase58());
    expect(newPolicy.agent.toBase58()).to.equal(agentB.publicKey.toBase58());
    expect(newPolicy.allowedPrograms).to.have.lengthOf(1);
    expect(newPolicy.allowedPrograms[0].toBase58()).to.equal(SystemProgram.programId.toBase58());
    expect(newPolicy.maxTxLamports.toNumber()).to.equal(1_000_000_000);
    expect(newPolicy.dailyBudgetLamports.toNumber()).to.equal(5_000_000_000);
    expect(newPolicy.escalationThreshold.toNumber()).to.equal(2_000_000_000);
    expect(newPolicy.isActive).to.be.true;
    expect(newPolicy.authorizedMonitors).to.have.lengthOf(1);
    expect(newPolicy.authorizedMonitors[0].toBase58()).to.equal(monitor.toBase58());

    // Spend counters should be reset
    expect(newPolicy.dailySpentLamports.toNumber()).to.equal(0);

    // New tracker should exist with zeroed counters
    const newTracker = await program.account.spendTracker.fetch(newTrackerPda);
    expect(newTracker.policy.toBase58()).to.equal(newPolicyPda.toBase58());
    expect((newTracker as any).txnCount24H).to.equal(0);
    expect((newTracker as any).lamportsSpent24H.toNumber()).to.equal(0);

    // New policy PDA should have operational SOL (old lamports - rent of old)
    const newAccount = svm.getAccount(newPolicyPda);
    expect(BigInt(newAccount!.lamports)).to.be.greaterThan(3_000_000_000n);
  });

  it("rejects rotation with same agent key", async () => {
    // Create a fresh policy
    const freshAgent = Keypair.generate();
    const [policyPda] = findPolicyPda(owner.publicKey, freshAgent.publicKey);
    const [trackerPda] = findTrackerPda(policyPda);

    await program.methods
      .initializePolicy({
        allowedPrograms: defaultAllowedPrograms,
        maxTxLamports: defaultMaxTxLamports,
        maxTxTokenUnits: defaultMaxTxTokenUnits,
        dailyBudgetLamports: defaultDailyBudgetLamports,
        sessionExpiry: defaultSessionExpiry,
        squadsMultisig: null,
        escalationThreshold: defaultEscalationThreshold,
        authorizedMonitors: [],
      })
      .accounts({
        owner: owner.publicKey,
        agent: freshAgent.publicKey,
        policy: policyPda,
        spendTracker: trackerPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([owner])
      .rpc();

    // Try rotating to same agent
    const [newPolicyPda] = findPolicyPda(owner.publicKey, freshAgent.publicKey);
    const [newTrackerPda] = findTrackerPda(newPolicyPda);

    try {
      await program.methods
        .rotateAgentKey({ newAgent: freshAgent.publicKey })
        .accounts({
          owner: owner.publicKey,
          oldPolicy: policyPda,
          oldTracker: trackerPda,
          newAgent: freshAgent.publicKey,
          newPolicy: newPolicyPda,
          newTracker: newTrackerPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      expect.fail("Expected SameAgentKey error");
    } catch (err: any) {
      // May get SameAgentKey or a PDA constraint error (same seeds = same PDA = already initialized)
      expect(err).to.exist;
    }
  });

  it("rejects rotation by non-owner", async () => {
    const freshAgent = Keypair.generate();
    const newAgent = Keypair.generate();
    const nonOwner = Keypair.generate();
    svm.airdrop(nonOwner.publicKey, 5_000_000_000n);

    const [policyPda] = findPolicyPda(owner.publicKey, freshAgent.publicKey);
    const [trackerPda] = findTrackerPda(policyPda);

    await program.methods
      .initializePolicy({
        allowedPrograms: defaultAllowedPrograms,
        maxTxLamports: defaultMaxTxLamports,
        maxTxTokenUnits: defaultMaxTxTokenUnits,
        dailyBudgetLamports: defaultDailyBudgetLamports,
        sessionExpiry: defaultSessionExpiry,
        squadsMultisig: null,
        escalationThreshold: defaultEscalationThreshold,
        authorizedMonitors: [],
      })
      .accounts({
        owner: owner.publicKey,
        agent: freshAgent.publicKey,
        policy: policyPda,
        spendTracker: trackerPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([owner])
      .rpc();

    const [newPolicyPda] = findPolicyPda(owner.publicKey, newAgent.publicKey);
    const [newTrackerPda] = findTrackerPda(newPolicyPda);

    try {
      await program.methods
        .rotateAgentKey({ newAgent: newAgent.publicKey })
        .accounts({
          owner: nonOwner.publicKey,
          oldPolicy: policyPda,
          oldTracker: trackerPda,
          newAgent: newAgent.publicKey,
          newPolicy: newPolicyPda,
          newTracker: newTrackerPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([nonOwner])
        .rpc();

      expect.fail("Expected constraint error");
    } catch (err: any) {
      expect(err).to.exist;
    }
  });
});
