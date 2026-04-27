// setup-demo.ts — Creates demo keypairs, policies, and funds PDAs on devnet.
// Run: cd dashboard && npm run demo:setup
//
// Creates three agents (trader, staker, attacker) with policies under one owner.
// Saves all keypairs to .demo-keys.json for the agent scripts to load.

import { Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  saveDemoKeys,
  getConnection,
  getClient,
  shortKey,
} from "./demo-helpers";

const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;

/** Load the Solana CLI default keypair to fund demo accounts. */
function loadFunderKeypair(): Keypair {
  const keypairPath = process.env.FUNDER_KEYPAIR
    ?? path.join(os.homedir(), ".config", "solana", "mywallet.json");
  const raw = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

async function main() {
  console.log("\n=== Agent Guardrails — Demo Setup ===\n");

  const connection = getConnection();
  const funder = loadFunderKeypair();
  console.log(`[demo] Funder: ${shortKey(funder.publicKey)}`);

  const funderBalance = await connection.getBalance(funder.publicKey);
  console.log(`[demo] Funder balance: ${(funderBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);

  if (funderBalance < 0.3 * LAMPORTS_PER_SOL) {
    throw new Error("Funder needs at least 0.3 SOL to set up demo");
  }

  // -------------------------------------------------------------------------
  // Step 1: Generate keypairs
  // -------------------------------------------------------------------------

  // Use funder as owner so on-chain authority matches the dashboard wallet
  const owner = funder;
  const monitor = Keypair.generate();
  const trader = Keypair.generate();
  const staker = Keypair.generate();
  const attacker = Keypair.generate();

  console.log("[demo] Generated keypairs:");
  console.log(`  Owner:    ${shortKey(owner.publicKey)}`);
  console.log(`  Monitor:  ${shortKey(monitor.publicKey)}`);
  console.log(`  Trader:   ${shortKey(trader.publicKey)}`);
  console.log(`  Staker:   ${shortKey(staker.publicKey)}`);
  console.log(`  Attacker: ${shortKey(attacker.publicKey)}`);

  // -------------------------------------------------------------------------
  // Step 2: Fund keypairs from funder wallet
  // -------------------------------------------------------------------------

  console.log("\n[demo] Funding keypairs from funder wallet…");

  // Minimal funding: owner needs enough for 3 policy creates + 3 PDA deposits.
  // Agents + monitor only need enough for transaction fees (~0.005 SOL each).
  // Owner IS the funder — no need to fund owner separately
  const fundingTx = new Transaction().add(
    SystemProgram.transfer({ fromPubkey: funder.publicKey, toPubkey: trader.publicKey, lamports: Math.floor(0.01 * LAMPORTS_PER_SOL) }),
    SystemProgram.transfer({ fromPubkey: funder.publicKey, toPubkey: staker.publicKey, lamports: Math.floor(0.01 * LAMPORTS_PER_SOL) }),
    SystemProgram.transfer({ fromPubkey: funder.publicKey, toPubkey: attacker.publicKey, lamports: Math.floor(0.01 * LAMPORTS_PER_SOL) }),
    SystemProgram.transfer({ fromPubkey: funder.publicKey, toPubkey: monitor.publicKey, lamports: Math.floor(0.01 * LAMPORTS_PER_SOL) }),
  );
  await sendAndConfirmTransaction(connection, fundingTx, [funder]);
  console.log("  ✓ All keypairs funded");

  // -------------------------------------------------------------------------
  // Step 3: Create policies
  // -------------------------------------------------------------------------

  const client = getClient(owner);
  const now = Math.floor(Date.now() / 1000);
  const sessionExpiry = new BN(now + SEVEN_DAYS_SECONDS);

  // --- Trader policy: System Program, 0.02 SOL per-tx, 0.2 SOL daily ---
  console.log("\n[demo] Creating trader policy…");
  const traderTxSig = await client.initializePolicy(trader.publicKey, {
    allowedPrograms: [SystemProgram.programId],
    maxTxLamports: new BN(0.02 * LAMPORTS_PER_SOL),
    maxTxTokenUnits: new BN(0),
    dailyBudgetLamports: new BN(0.2 * LAMPORTS_PER_SOL),
    sessionExpiry,
    squadsMultisig: null,
    escalationThreshold: new BN(0),
    authorizedMonitors: [monitor.publicKey],
  });
  console.log(`  ✓ Trader policy created: ${traderTxSig.slice(0, 20)}…`);

  // --- Staker policy: System Program, 0.01 SOL per-tx, 0.1 SOL daily ---
  console.log("[demo] Creating staker policy…");
  const stakerTxSig = await client.initializePolicy(staker.publicKey, {
    allowedPrograms: [SystemProgram.programId],
    maxTxLamports: new BN(0.01 * LAMPORTS_PER_SOL),
    maxTxTokenUnits: new BN(0),
    dailyBudgetLamports: new BN(0.1 * LAMPORTS_PER_SOL),
    sessionExpiry,
    squadsMultisig: null,
    escalationThreshold: new BN(0),
    authorizedMonitors: [monitor.publicKey],
  });
  console.log(`  ✓ Staker policy created: ${stakerTxSig.slice(0, 20)}…`);

  // --- Attacker policy: System Program, 0.02 SOL per-tx, 0.2 SOL daily ---
  console.log("[demo] Creating attacker policy…");
  const attackerTxSig = await client.initializePolicy(attacker.publicKey, {
    allowedPrograms: [SystemProgram.programId],
    maxTxLamports: new BN(0.02 * LAMPORTS_PER_SOL),
    maxTxTokenUnits: new BN(0),
    dailyBudgetLamports: new BN(0.2 * LAMPORTS_PER_SOL),
    sessionExpiry,
    squadsMultisig: null,
    escalationThreshold: new BN(0),
    authorizedMonitors: [monitor.publicKey],
  });
  console.log(`  ✓ Attacker policy created: ${attackerTxSig.slice(0, 20)}…`);

  // -------------------------------------------------------------------------
  // Step 4: Fund policy PDAs with SOL
  // -------------------------------------------------------------------------

  console.log("\n[demo] Funding policy PDAs…");

  const fundingPlan: [string, Keypair, number][] = [
    ["trader", trader, 0.03],
    ["staker", staker, 0.03],
    ["attacker", attacker, 0.05],
  ];

  for (const [label, agentKp, amount] of fundingPlan) {
    const [policyPda] = client.findPolicyPda(owner.publicKey, agentKp.publicKey);

    const tx = new (await import("@solana/web3.js")).Transaction().add(
      SystemProgram.transfer({
        fromPubkey: owner.publicKey,
        toPubkey: policyPda,
        lamports: Math.floor(amount * LAMPORTS_PER_SOL),
      }),
    );

    await (client.program.provider as any).sendAndConfirm(tx);
    console.log(`  ✓ ${label} PDA funded with ${amount} SOL (${shortKey(policyPda)})`);
  }

  // -------------------------------------------------------------------------
  // Step 5: Insert policies into the server database
  // -------------------------------------------------------------------------

  console.log("\n[demo] Inserting policies into server database…");

  const { execSync } = await import("child_process");
  const dbUrl = process.env.DATABASE_URL ?? "postgresql://adilshaikh@localhost:5432/guardrails_dev";

  const policyRows: { label: string; agent: Keypair; maxTx: number; dailyBudget: number }[] = [
    { label: "Yield Bot (trader)", agent: trader, maxTx: 0.02, dailyBudget: 0.2 },
    { label: "Staking Agent (staker)", agent: staker, maxTx: 0.01, dailyBudget: 0.1 },
    { label: "Alpha Scanner (attacker)", agent: attacker, maxTx: 0.02, dailyBudget: 0.2 },
  ];

  for (const row of policyRows) {
    const [pda] = client.findPolicyPda(owner.publicKey, row.agent.publicKey);
    // Escape single quotes in label to prevent SQL injection
    const safeLabel = row.label.replace(/'/g, "''");
    const sql = `INSERT INTO policies (pubkey, owner, agent, allowed_programs, max_tx_lamports, daily_budget_lamports, session_expiry, is_active, escalation_threshold, anomaly_score, label, created_at, updated_at) VALUES ('${pda.toBase58()}', '${owner.publicKey.toBase58()}', '${row.agent.publicKey.toBase58()}', '{${SystemProgram.programId.toBase58()}}', ${row.maxTx * LAMPORTS_PER_SOL}, ${row.dailyBudget * LAMPORTS_PER_SOL}, '${new Date((now + SEVEN_DAYS_SECONDS) * 1000).toISOString()}', true, 0, 0, '${safeLabel}', NOW(), NOW()) ON CONFLICT (pubkey) DO NOTHING;`;
    execSync(`psql "${dbUrl}" -c "${sql}"`, { stdio: "pipe" });
    console.log(`  ✓ ${row.label} → ${shortKey(pda)}`);
  }

  // -------------------------------------------------------------------------
  // Step 6: Save keypairs
  // -------------------------------------------------------------------------

  saveDemoKeys({
    owner: Array.from(owner.secretKey),
    monitor: Array.from(monitor.secretKey),
    trader: Array.from(trader.secretKey),
    staker: Array.from(staker.secretKey),
    attacker: Array.from(attacker.secretKey),
    funder: Array.from(funder.secretKey),
  });

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------

  const [traderPda] = client.findPolicyPda(owner.publicKey, trader.publicKey);
  const [stakerPda] = client.findPolicyPda(owner.publicKey, staker.publicKey);
  const [attackerPda] = client.findPolicyPda(owner.publicKey, attacker.publicKey);

  console.log("\n=== Demo Setup Complete ===\n");
  console.log("Policies:");
  console.log(`  Trader:   ${traderPda.toBase58()}`);
  console.log(`  Staker:   ${stakerPda.toBase58()}`);
  console.log(`  Attacker: ${attackerPda.toBase58()}`);
  console.log(`\nOwner:   ${owner.publicKey.toBase58()}`);
  console.log(`Monitor: ${monitor.publicKey.toBase58()}`);
  console.log(`Funder:  ${funder.publicKey.toBase58()}`);
  console.log("\nReady to test: npm run demo:trader");
}

main().catch((err) => {
  console.error("[demo] Setup failed:", err);
  process.exit(1);
});
