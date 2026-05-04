import { create } from "zustand";
import { Keypair } from "@solana/web3.js";

export interface SimulationLogEntry {
  id: string;
  timestamp: string;
  txIndex: number;
  amountLamports: number;
  amountSol: string;
  signature: string | null;
  status: "success" | "failed";
  error: string | null;
}

export type SimulationMode = "honest" | "attack" | "custom";

export interface CustomParams {
  minAmountSol: number;
  maxAmountSol: number;
  intervalSec: number;
  maxTransactions: number;
}

interface SimulationState {
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;

  secretKeyInput: string;
  setSecretKeyInput: (val: string) => void;
  agentKeypairBytes: Uint8Array | null;
  derivedPubkey: string | null;
  keyError: string | null;

  mode: SimulationMode;
  setMode: (m: SimulationMode) => void;
  customParams: CustomParams;
  setCustomParams: (p: Partial<CustomParams>) => void;

  isRunning: boolean;
  setIsRunning: (v: boolean) => void;
  sentCount: number;
  successCount: number;
  failedCount: number;
  log: SimulationLogEntry[];
  pushLog: (entry: SimulationLogEntry) => void;
  incrementSent: () => void;
  incrementSuccess: () => void;
  incrementFailed: () => void;
  stopReason: string | null;
  setStopReason: (r: string | null) => void;

  resetSimulation: () => void;
  resetAll: () => void;
}

const DEFAULT_CUSTOM: CustomParams = {
  minAmountSol: 0.001,
  maxAmountSol: 0.01,
  intervalSec: 10,
  maxTransactions: 10,
};

function decodeSecretKey(input: string): {
  bytes: Uint8Array;
  pubkey: string;
  error: null;
} | { bytes: null; pubkey: null; error: string } {
  if (!input.trim()) {
    return { bytes: null, pubkey: null, error: "" };
  }
  try {
    const json = Buffer.from(input.trim(), "base64").toString("utf-8");
    const arr: number[] = JSON.parse(json);
    if (!Array.isArray(arr) || arr.length !== 64) {
      return { bytes: null, pubkey: null, error: "Expected 64-byte secret key array" };
    }
    const bytes = Uint8Array.from(arr);
    const kp = Keypair.fromSecretKey(bytes);
    return { bytes, pubkey: kp.publicKey.toBase58(), error: null };
  } catch {
    return { bytes: null, pubkey: null, error: "Invalid secret key format" };
  }
}

export const useSimulationStore = create<SimulationState>((set) => ({
  panelOpen: false,
  setPanelOpen: (panelOpen) => set({ panelOpen }),

  secretKeyInput: "",
  setSecretKeyInput: (val: string) => {
    const result = decodeSecretKey(val);
    set({
      secretKeyInput: val,
      agentKeypairBytes: result.bytes,
      derivedPubkey: result.pubkey,
      keyError: result.error,
    });
  },
  agentKeypairBytes: null,
  derivedPubkey: null,
  keyError: null,

  mode: "honest",
  setMode: (mode) => set({ mode }),
  customParams: { ...DEFAULT_CUSTOM },
  setCustomParams: (p) =>
    set((s) => ({ customParams: { ...s.customParams, ...p } })),

  isRunning: false,
  setIsRunning: (isRunning) => set({ isRunning }),
  sentCount: 0,
  successCount: 0,
  failedCount: 0,
  log: [],
  pushLog: (entry) => set((s) => ({ log: [...s.log, entry] })),
  incrementSent: () => set((s) => ({ sentCount: s.sentCount + 1 })),
  incrementSuccess: () => set((s) => ({ successCount: s.successCount + 1 })),
  incrementFailed: () => set((s) => ({ failedCount: s.failedCount + 1 })),
  stopReason: null,
  setStopReason: (stopReason) => set({ stopReason }),

  resetSimulation: () =>
    set({
      isRunning: false,
      sentCount: 0,
      successCount: 0,
      failedCount: 0,
      log: [],
      stopReason: null,
    }),

  resetAll: () =>
    set({
      panelOpen: false,
      secretKeyInput: "",
      agentKeypairBytes: null,
      derivedPubkey: null,
      keyError: null,
      mode: "honest",
      customParams: { ...DEFAULT_CUSTOM },
      isRunning: false,
      sentCount: 0,
      successCount: 0,
      failedCount: 0,
      log: [],
      stopReason: null,
    }),
}));
