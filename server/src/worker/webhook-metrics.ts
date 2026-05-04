// In-memory webhook ingress metrics (resets on process restart).

const EVENT_WINDOW_MS = 60 * 60 * 1000;

let lastWebhookReceivedAt: Date | null = null;
const recentEventCounts: number[] = [];

function prune(now: number): void {
  const cutoff = now - EVENT_WINDOW_MS;
  while (recentEventCounts.length > 0 && recentEventCounts[0]! < cutoff) {
    recentEventCounts.shift();
  }
}

/** Called after a verified Helius webhook accepts a batch (once per HTTP delivery). */
export function recordWebhookIngress(eventsInBatch: number): void {
  const now = Date.now();
  lastWebhookReceivedAt = new Date(now);
  prune(now);
  for (let i = 0; i < eventsInBatch; i++) {
    recentEventCounts.push(now);
  }
}

export function getWebhookIngressSnapshot(): {
  lastWebhookReceivedAt: string | null;
  eventsReceivedLastHour: number;
} {
  const now = Date.now();
  prune(now);
  return {
    lastWebhookReceivedAt: lastWebhookReceivedAt?.toISOString() ?? null,
    eventsReceivedLastHour: recentEventCounts.length,
  };
}
