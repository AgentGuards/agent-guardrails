import { create } from "zustand";

export type SSELogEntry = {
  id: string;
  type: string;
  payload: unknown;
  receivedAt: string;
};

const MAX_ENTRIES = 50;

type SSEEventLogState = {
  entries: SSELogEntry[];
  push: (type: string, payload: unknown) => void;
};

/** Ring buffer of recent SSE payloads for terminal-style views (e.g. fleet dashboard). */
export const useSSEEventLogStore = create<SSEEventLogState>((set) => ({
  entries: [],
  push: (type, payload) =>
    set((s) => ({
      entries: [
        ...s.entries,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          type,
          payload,
          receivedAt: new Date().toISOString(),
        },
      ].slice(-MAX_ENTRIES),
    })),
}));
