import { Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
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
  const args = {
    instructionData: ixData,
    amountHint: new BN(lamports),
    inputAccountIndex: null,
  };

  const ix = await (client.program.methods as any)
    .guardedExecute(args)
    .accounts({
      agent: agentKeypair.publicKey,
      policy: policyPda,
      spendTracker: trackerPda,
      targetProgram: SystemProgram.programId,
      systemProgram: SystemProgram.programId,
    })
    .remainingAccounts([{ pubkey: destination, isSigner: false, isWritable: true }])
    .instruction();

  const connection = client.program.provider.connection;
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  const tx = new Transaction({ feePayer: agentKeypair.publicKey, blockhash, lastValidBlockHeight }).add(ix);
  tx.sign(agentKeypair);

  const raw = tx.serialize();
  let sig: string;
  try {
    sig = await connection.sendRawTransaction(raw, { skipPreflight: false, maxRetries: 0 });
  } catch (e: unknown) {
    const sendErr = e as { message?: string; logs?: string[] };
    const logs = Array.isArray(sendErr.logs) ? sendErr.logs : [];
    const programLog = logs.find((l) => /custom program error|Error Code|Error Number|AnchorError/i.test(l));
    const baseMsg = sendErr.message ?? String(e);
    const err = new Error(programLog ? `${baseMsg} — ${programLog}` : baseMsg) as Error & { logs: string[] };
    err.logs = logs;
    throw err;
  }

  const conf = await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
  if (conf.value.err) {
    const txDetails = await connection.getTransaction(sig, { commitment: "confirmed" });
    const logs = txDetails?.meta?.logMessages ?? [];
    const programLog = logs.find((l) => /custom program error|Error Code|Error Number|AnchorError/i.test(l));
    const errStr = typeof conf.value.err === "string" ? conf.value.err : JSON.stringify(conf.value.err);
    const err = new Error(programLog ? `${errStr} — ${programLog}` : errStr) as Error & { logs: string[] };
    err.logs = logs;
    throw err;
  }
  return sig;
}

export function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
