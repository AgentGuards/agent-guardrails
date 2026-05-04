import { create } from "zustand";
import { DEFAULT_CRAFTER_PARAMS } from "@/lib/playground/constants";
import type {
  CrafterParams,
  PlaygroundTab,
  ScenarioPlayback,
  SimulationResult,
  PrefilterSignal,
} from "@/lib/playground/types";

const ALL_SIGNALS: PrefilterSignal[] = [
  "burst_detected",
  "high_amount",
  "budget_nearly_exhausted",
  "new_or_uncommon_program",
  "outside_active_hours",
  "session_expiring_soon",
  "elevated_frequency",
];

function initialInspector(): Record<PrefilterSignal, boolean> {
  return Object.fromEntries(ALL_SIGNALS.map((s) => [s, false])) as Record<PrefilterSignal, boolean>;
}

export type SandboxOverrides = {
  maxTxSol: number;
  dailyBudgetSol: number;
};

interface PlaygroundState {
  activeTab: PlaygroundTab;
  crafterParams: CrafterParams;
  crafterResult: SimulationResult | null;
  crafterRunning: boolean;
  crafterProgress: number;

  playback: ScenarioPlayback | null;

  inspectorSignals: Record<PrefilterSignal, boolean>;

  killSwitchState: "active" | "paused";

  sandboxOverrides: SandboxOverrides;

  setActiveTab: (t: PlaygroundTab) => void;
  setCrafterParams: (p: Partial<CrafterParams>) => void;
  setCrafterResult: (r: SimulationResult | null) => void;
  setCrafterRunning: (v: boolean) => void;
  setCrafterProgress: (n: number) => void;

  setPlayback: (p: ScenarioPlayback | null) => void;

  toggleInspectorSignal: (s: PrefilterSignal) => void;
  resetInspector: () => void;

  setKillSwitchState: (s: "active" | "paused") => void;

  setSandboxOverrides: (p: Partial<SandboxOverrides>) => void;
}

export const usePlaygroundStore = create<PlaygroundState>((set) => ({
  activeTab: "simulate",
  crafterParams: { ...DEFAULT_CRAFTER_PARAMS },
  crafterResult: null,
  crafterRunning: false,
  crafterProgress: 0,

  playback: null,

  inspectorSignals: initialInspector(),

  killSwitchState: "active",

  sandboxOverrides: { maxTxSol: 5, dailyBudgetSol: 50 },

  setActiveTab: (activeTab) => set({ activeTab }),
  setCrafterParams: (partial) =>
    set((s) => ({
      crafterParams: { ...s.crafterParams, ...partial },
    })),
  setCrafterResult: (crafterResult) => set({ crafterResult }),
  setCrafterRunning: (crafterRunning) => set({ crafterRunning }),
  setCrafterProgress: (crafterProgress) => set({ crafterProgress }),

  setPlayback: (playback) => set({ playback }),

  toggleInspectorSignal: (sig) =>
    set((s) => ({
      inspectorSignals: { ...s.inspectorSignals, [sig]: !s.inspectorSignals[sig] },
    })),
  resetInspector: () => set({ inspectorSignals: initialInspector() }),

  setKillSwitchState: (killSwitchState) => set({ killSwitchState }),

  setSandboxOverrides: (partial) =>
    set((s) => ({
      sandboxOverrides: { ...s.sandboxOverrides, ...partial },
    })),
}));

export function inspectorSignalsToList(map: Record<PrefilterSignal, boolean>): PrefilterSignal[] {
  return ALL_SIGNALS.filter((s) => map[s]);
}
