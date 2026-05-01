// GET /api/settings/webhook-status — Helius webhook URL + ingress metrics.
// GET /api/settings/llm — resolved judge/report models (read-only).

import express from "express";
import { env } from "../../config/env.js";
import { getDashboardLLMInfo } from "../../config/llm.js";
import { getWebhookIngressSnapshot } from "../../worker/webhook-metrics.js";

export const settingsRouter: express.Router = express.Router();

settingsRouter.get("/webhook-status", (_req, res) => {
  try {
    const base =
      env.PUBLIC_WEBHOOK_BASE_URL?.replace(/\/$/, "") ?? `http://localhost:${env.PORT}`;
    const webhookUrl = `${base}/webhook`;
    const snapshot = getWebhookIngressSnapshot();

    res.json({
      webhookUrl,
      lastWebhookReceivedAt: snapshot.lastWebhookReceivedAt,
      eventsReceivedLastHour: snapshot.eventsReceivedLastHour,
    });
  } catch (err) {
    console.error("[api/settings/webhook-status] error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

settingsRouter.get("/llm", (_req, res) => {
  try {
    const info = getDashboardLLMInfo();
    res.json(info);
  } catch (err) {
    console.error("[api/settings/llm] error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
