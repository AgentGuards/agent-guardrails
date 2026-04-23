import { useEffect } from "react";

export function useSSE(): void {
  useEffect(() => {
    // Phase 1 is mock-backed only. Realtime wiring starts in Phase 3.
  }, []);
}
