// Shared read-only GuardrailsClient for on-chain account fetches.
// Used by sync-policy.ts and sync-tracker.ts.

import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair } from "@solana/web3.js";
import { GuardrailsClient } from "../../sdk/client.js";
import { env } from "../../config/env.js";

let _client: GuardrailsClient | null = null;

export function getReadClient(): GuardrailsClient {
  if (!_client) {
    const connection = new Connection(env.SOLANA_RPC_URL, "confirmed");
    // Dummy wallet — we only read, never sign
    const wallet = new Wallet(Keypair.generate());
    const provider = new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });
    _client = new GuardrailsClient(provider);
  }
  return _client;
}
