"use client";

import { Connection, Keypair, PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import * as multisig from "@sqds/multisig";
import type { AnchorWallet } from "@solana/wallet-adapter-react";

/**
 * Create a new Squads v4 multisig on-chain.
 *
 * @param connection - Solana RPC connection
 * @param wallet - Connected wallet (pays fees + signs)
 * @param members - Wallet addresses of multisig members
 * @param threshold - Number of approvals required
 * @returns The multisig PDA and default vault (index 0) PDA
 */
export async function createSquadsMultisig(
  connection: Connection,
  wallet: AnchorWallet,
  members: string[],
  threshold: number,
): Promise<{ multisigPda: PublicKey; vaultPda: PublicKey }> {
  // Generate a random createKey as the multisig identifier seed
  const createKey = Keypair.generate();

  // Derive the multisig PDA
  const [multisigPda] = multisig.getMultisigPda({
    createKey: createKey.publicKey,
  });

  // Derive the default vault PDA (index 0)
  const [vaultPda] = multisig.getVaultPda({
    multisigPda,
    index: 0,
  });

  // Build the member list with permissions
  const membersList: multisig.types.Member[] = members.map((pubkey) => ({
    key: new PublicKey(pubkey),
    permissions: multisig.types.Permissions.all(),
  }));

  // Read the Squads program config to get the protocol treasury address
  const [programConfigPda] = multisig.getProgramConfigPda({ programId: multisig.PROGRAM_ID });
  const configAccount = await connection.getAccountInfo(programConfigPda);
  let treasury: PublicKey;
  if (configAccount && configAccount.data.length >= 80) {
    // Treasury pubkey is at offset 48 (after 8 discriminator + 32 authority + 8 fee)
    treasury = new PublicKey(configAccount.data.subarray(48, 80));
  } else {
    treasury = programConfigPda;
  }

  // Build the create multisig instruction
  const createIx = multisig.instructions.multisigCreateV2({
    createKey: createKey.publicKey,
    creator: wallet.publicKey,
    multisigPda,
    configAuthority: null,
    timeLock: 0,
    members: membersList,
    threshold,
    rentCollector: null,
    treasury,
  });

  // Build and send the transaction
  const { blockhash } = await connection.getLatestBlockhash();
  const message = new TransactionMessage({
    payerKey: wallet.publicKey,
    recentBlockhash: blockhash,
    instructions: [createIx],
  }).compileToV0Message();

  const tx = new VersionedTransaction(message);
  const signed = await wallet.signTransaction(tx);

  // createKey must also sign the transaction
  signed.sign([createKey]);

  const sig = await connection.sendRawTransaction(signed.serialize());
  await connection.confirmTransaction(sig, "confirmed");

  return { multisigPda, vaultPda };
}
