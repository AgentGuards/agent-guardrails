import { useCallback, useEffect, useRef } from "react";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, type Transaction, type VersionedTransaction } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { GuardrailsClient } from "@/lib/sdk/client";
import { browserGuardedSolTransfer, randomBetween } from "@/lib/simulation/build-transfer-ix-data";
import { useSimulationStore, type SimulationLogEntry } from "@/lib/stores/simulation";
import type { PolicySummary } from "@/lib/types/dashboard";

/**
 * Browser-safe wallet wrapper for a Keypair.
 * The Anchor `Wallet` class is stripped from the browser bundle because it
 * depends on Node filesystem APIs. AnchorProvider only needs publicKey +
 * signTransaction + signAllTransactions, so we implement those directly.
 */
class KeypairWallet {
  constructor(readonly payer: Keypair) {}
  get publicKey() {
    return this.payer.publicKey;
  }
  async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
    if ("sign" in tx) {
      (tx as Transaction).sign(this.payer);
    }
    return tx;
  }
  async signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
    for (const tx of txs) {
      await this.signTransaction(tx);
    }
    return txs;
  }
}

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const PROGRAM_ID_STR = process.env.NEXT_PUBLIC_GUARDRAILS_PROGRAM_ID;

interface ModePreset {
  minLamports: number;
  maxLamports: number;
  intervalMs: number;
  maxTxns: number;
}

const HONEST_PRESET: ModePreset = {
  minLamports: 0.001 * LAMPORTS_PER_SOL,
  maxLamports: 0.005 * LAMPORTS_PER_SOL,
  intervalMs: 15_000,
  maxTxns: 20,
};

interface AttackPhase {
  count: number;
  minLamports: number;
  maxLamports: number;
  intervalMs: number;
}

const ATTACK_PHASES: AttackPhase[] = [
  { count: 2, minLamports: 0.003 * LAMPORTS_PER_SOL, maxLamports: 0.004 * LAMPORTS_PER_SOL, intervalMs: 10_000 },
  { count: 5, minLamports: 0.015 * LAMPORTS_PER_SOL, maxLamports: 0.02 * LAMPORTS_PER_SOL, intervalMs: 3_000 },
];

function getAttackParams(txIndex: number): { lamports: number; intervalMs: number } | null {
  let offset = 0;
  for (const phase of ATTACK_PHASES) {
    if (txIndex < offset + phase.count) {
      return {
        lamports: randomBetween(phase.minLamports, phase.maxLamports),
        intervalMs: phase.intervalMs,
      };
    }
    offset += phase.count;
  }
  return null;
}

const ATTACK_TOTAL = ATTACK_PHASES.reduce((sum, p) => sum + p.count, 0);

// Stable destination for simulation transfers (devnet throwaway)
const DESTINATION = new PublicKey("11111111111111111111111111111112");

export function useSimulationRunner(policy: PolicySummary) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoppedRef = useRef(false);

  const store = useSimulationStore;

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    clearTimer();
    store.getState().setIsRunning(false);
  }, [clearTimer, store]);

  const start = useCallback(() => {
    const state = store.getState();
    if (!state.agentKeypairBytes || !PROGRAM_ID_STR) return;

    state.resetSimulation();
    state.setIsRunning(true);
    stoppedRef.current = false;

    const keypair = Keypair.fromSecretKey(state.agentKeypairBytes);
    const connection = new Connection(RPC_URL, "confirmed");
    const wallet = new KeypairWallet(keypair);
    const provider = new AnchorProvider(connection, wallet as any, { commitment: "confirmed" });
    const programId = new PublicKey(PROGRAM_ID_STR);
    const client = new GuardrailsClient(provider, programId);

    const [policyPda] = client.findPolicyPda(
      new PublicKey(policy.owner),
      new PublicKey(policy.agent),
    );
    const [trackerPda] = client.findTrackerPda(policyPda);

    const mode = state.mode;

    let txIndex = 0;

    const tick = async () => {
      if (stoppedRef.current) return;

      const currentState = store.getState();

      let lamports: number;
      let intervalMs: number;
      let maxTxns: number;

      if (mode === "honest") {
        lamports = randomBetween(HONEST_PRESET.minLamports, HONEST_PRESET.maxLamports);
        intervalMs = HONEST_PRESET.intervalMs;
        maxTxns = HONEST_PRESET.maxTxns;
      } else if (mode === "attack") {
        const params = getAttackParams(txIndex);
        if (!params) {
          store.getState().setStopReason("Attack sequence complete");
          stop();
          return;
        }
        lamports = params.lamports;
        intervalMs = params.intervalMs;
        maxTxns = ATTACK_TOTAL;
      } else {
        const cp = currentState.customParams;
        lamports = randomBetween(
          Math.round(cp.minAmountSol * LAMPORTS_PER_SOL),
          Math.round(cp.maxAmountSol * LAMPORTS_PER_SOL),
        );
        intervalMs = cp.intervalSec * 1000;
        maxTxns = cp.maxTransactions;
      }

      if (txIndex >= maxTxns) {
        store.getState().setStopReason(`Reached max transactions (${maxTxns})`);
        stop();
        return;
      }

      store.getState().incrementSent();
      const idx = txIndex;
      txIndex++;

      const solStr = (lamports / LAMPORTS_PER_SOL).toFixed(4);
      const entryBase: Omit<SimulationLogEntry, "signature" | "status" | "error"> = {
        id: `sim-${Date.now()}-${idx}`,
        timestamp: new Date().toISOString(),
        txIndex: idx + 1,
        amountLamports: lamports,
        amountSol: solStr,
      };

      try {
        const sig = await browserGuardedSolTransfer(
          client, keypair, policyPda, trackerPda, DESTINATION, lamports,
        );
        store.getState().incrementSuccess();
        store.getState().pushLog({ ...entryBase, signature: sig, status: "success", error: null });
      } catch (e: unknown) {
        store.getState().incrementFailed();
        const msg = e instanceof Error ? e.message : String(e);
        store.getState().pushLog({ ...entryBase, signature: null, status: "failed", error: msg });

        if (msg.includes("6000")) {
          store.getState().setStopReason("Policy paused (error 6000)");
          stop();
          return;
        }
        if (msg.includes("6004")) {
          store.getState().setStopReason("Daily budget exceeded (error 6004)");
          stop();
          return;
        }
      }

      if (!stoppedRef.current) {
        timerRef.current = setTimeout(() => void tick(), intervalMs);
      }
    };

    void tick();
  }, [policy, stop, store, clearTimer]);

  useEffect(() => {
    return () => {
      stoppedRef.current = true;
      clearTimer();
    };
  }, [clearTimer]);

  return { start, stop };
}
