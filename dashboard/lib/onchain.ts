"use client";

import { BN } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { GuardrailsClient } from "@/lib/sdk/client";
import type { UpdatePolicyArgs } from "@/lib/sdk/types";
import { getProgramId, useAnchorProvider } from "@/components/providers";

function useGuardrailsClient(): GuardrailsClient | null {
  const provider = useAnchorProvider();
  const programId = getProgramId();

  if (!provider || !programId) {
    return null;
  }

  return new GuardrailsClient(provider, programId);
}

export function useGuardrailsActions() {
  const client = useGuardrailsClient();

  return {
    async initializePolicy(owner: Keypair, agent: PublicKey, args: Parameters<GuardrailsClient["initializePolicy"]>[2]) {
      if (!client) throw new Error("Wallet or program is not configured");
      return client.initializePolicy(owner, agent, args);
    },
    async pauseAgent(owner: Keypair, policyPubkey: string, reason: string) {
      if (!client) throw new Error("Wallet or program is not configured");
      return client.pauseAgent(owner, new PublicKey(policyPubkey), reason);
    },
    async resumeAgent(owner: Keypair, policyPubkey: string) {
      if (!client) throw new Error("Wallet or program is not configured");
      return client.resumeAgent(owner, new PublicKey(policyPubkey));
    },
    async updatePolicy(owner: Keypair, policyPubkey: string, args: UpdatePolicyArgs) {
      if (!client) throw new Error("Wallet or program is not configured");
      return client.updatePolicy(owner, new PublicKey(policyPubkey), args);
    },
    bn(value: number | string): BN {
      return new BN(value);
    },
  };
}
