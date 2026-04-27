"use client";

import { Connection, PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import * as multisig from "@sqds/multisig";
import type { AnchorWallet } from "@solana/wallet-adapter-react";
import { fetchEscalation, updateEscalationProposal } from "@/lib/api/client";

/**
 * Create a Squads vault transaction + proposal for an escalated transaction.
 *
 * Flow:
 * 1. Fetch the escalation detail (includes reconstructed instruction)
 * 2. Derive the vault PDA from the multisig
 * 3. Create a vault transaction containing the target instruction
 * 4. Create a proposal for the vault transaction
 * 5. PATCH the server with the proposal PDA and transaction index
 */
export async function createEscalationProposal(
  connection: Connection,
  wallet: AnchorWallet,
  escalationId: string,
): Promise<{ proposalPda: PublicKey; transactionIndex: bigint }> {
  // 1. Fetch the escalation with reconstructed instruction
  const escalation = await fetchEscalation(escalationId);

  if (!escalation.instruction) {
    throw new Error("No reconstructed instruction available for this escalation.");
  }

  const multisigPda = new PublicKey(escalation.squadsMultisig);

  // 2. Fetch the multisig account to get current transaction index
  const multisigAccount = await multisig.accounts.Multisig.fromAccountAddress(
    connection,
    multisigPda,
  );
  const transactionIndex = BigInt(multisigAccount.transactionIndex.toString()) + 1n;

  // 3. Derive the vault PDA (index 0)
  const [vaultPda] = multisig.getVaultPda({ multisigPda, index: 0 });

  // Build the target instruction with the vault PDA as signer
  const targetInstruction = {
    programId: new PublicKey(escalation.instruction.programId),
    data: Buffer.from(escalation.instruction.data, "base64"),
    keys: escalation.instruction.accounts.map((acc) => ({
      pubkey: new PublicKey(acc.pubkey),
      isSigner: acc.isSigner ? true : false,
      isWritable: acc.isWritable,
    })),
  };

  // Replace any policy PDA signers with the vault PDA
  for (const key of targetInstruction.keys) {
    if (key.isSigner && key.pubkey.toBase58() !== wallet.publicKey.toBase58()) {
      key.pubkey = vaultPda;
    }
  }

  // 4. Create vault transaction
  const createVaultTxIx = multisig.instructions.vaultTransactionCreate({
    multisigPda,
    transactionIndex,
    creator: wallet.publicKey,
    vaultIndex: 0,
    ephemeralSigners: 0,
    transactionMessage: new TransactionMessage({
      payerKey: vaultPda,
      recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
      instructions: [targetInstruction],
    }),
  });

  // 5. Create proposal
  const createProposalIx = multisig.instructions.proposalCreate({
    multisigPda,
    transactionIndex,
    creator: wallet.publicKey,
  });

  // Send both in one transaction
  const { blockhash } = await connection.getLatestBlockhash();
  const message = new TransactionMessage({
    payerKey: wallet.publicKey,
    recentBlockhash: blockhash,
    instructions: [createVaultTxIx, createProposalIx],
  }).compileToV0Message();

  const tx = new VersionedTransaction(message);
  const signed = await wallet.signTransaction(tx);
  const sig = await connection.sendRawTransaction(signed.serialize());
  await connection.confirmTransaction(sig, "confirmed");

  // 6. Derive proposal PDA
  const [proposalPda] = multisig.getProposalPda({
    multisigPda,
    transactionIndex,
  });

  // 7. Update the server
  await updateEscalationProposal(
    escalationId,
    proposalPda.toBase58(),
    transactionIndex.toString(),
  );

  return { proposalPda, transactionIndex };
}

/**
 * Approve a pending Squads proposal.
 */
export async function approveProposal(
  connection: Connection,
  wallet: AnchorWallet,
  multisigAddress: string,
  transactionIndex: string,
): Promise<string> {
  const multisigPda = new PublicKey(multisigAddress);
  const txIndex = BigInt(transactionIndex);

  const approveIx = multisig.instructions.proposalApprove({
    multisigPda,
    transactionIndex: txIndex,
    member: wallet.publicKey,
  });

  const { blockhash } = await connection.getLatestBlockhash();
  const message = new TransactionMessage({
    payerKey: wallet.publicKey,
    recentBlockhash: blockhash,
    instructions: [approveIx],
  }).compileToV0Message();

  const tx = new VersionedTransaction(message);
  const signed = await wallet.signTransaction(tx);
  const sig = await connection.sendRawTransaction(signed.serialize());
  await connection.confirmTransaction(sig, "confirmed");

  return sig;
}

/**
 * Execute an approved Squads vault transaction.
 */
export async function executeProposal(
  connection: Connection,
  wallet: AnchorWallet,
  multisigAddress: string,
  transactionIndex: string,
): Promise<string> {
  const multisigPda = new PublicKey(multisigAddress);
  const txIndex = BigInt(transactionIndex);

  const { instruction: executeIx, lookupTableAccounts } =
    await multisig.instructions.vaultTransactionExecute({
      connection,
      multisigPda,
      transactionIndex: txIndex,
      member: wallet.publicKey,
    });

  const { blockhash } = await connection.getLatestBlockhash();
  const message = new TransactionMessage({
    payerKey: wallet.publicKey,
    recentBlockhash: blockhash,
    instructions: [executeIx],
  }).compileToV0Message(lookupTableAccounts);

  const tx = new VersionedTransaction(message);
  const signed = await wallet.signTransaction(tx);
  const sig = await connection.sendRawTransaction(signed.serialize());
  await connection.confirmTransaction(sig, "confirmed");

  return sig;
}
