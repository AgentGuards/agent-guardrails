import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import type { GuardrailsClient } from "@/lib/sdk/client";

export function buildTransferIxData(lamports: bigint): Buffer {
  const data = Buffer.alloc(12);
  data.writeUInt32LE(2, 0);
  data.writeBigUInt64LE(lamports, 4);
  return data;
}

export async function browserGuardedSolTransfer(
  client: GuardrailsClient,
  agentKeypair: Keypair,
  policyPda: PublicKey,
  trackerPda: PublicKey,
  destination: PublicKey,
  lamports: number,
): Promise<string> {
  const ixData = buildTransferIxData(BigInt(lamports));
  return client.guardedExecute(
    agentKeypair,
    policyPda,
    trackerPda,
    SystemProgram.programId,
    {
      instructionData: ixData,
      amountHint: new BN(lamports),
      inputAccountIndex: null,
    },
    [{ pubkey: destination, isSigner: false, isWritable: true }],
  );
}

export function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
