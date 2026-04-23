// GET /api/events — Server-Sent Events stream.
// Streams 4 event types from the SSE emitter to connected dashboard clients.

import express from "express";
import { sseEmitter, type SSEEventName } from "../../sse/emitter.js";

export const eventsRouter: express.Router = express.Router();

const SSE_EVENTS: SSEEventName[] = [
  "new_transaction",
  "verdict",
  "agent_paused",
  "report_ready",
];

eventsRouter.get("/", (req, res) => {
  // SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  // Send initial keepalive
  res.write(":ok\n\n");

  // Create listeners for each event type
  const listeners = SSE_EVENTS.map((eventName) => {
    const handler = (data: unknown) => {
      res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    sseEmitter.on(eventName, handler);
    return { eventName, handler };
  });

  // Clean up on client disconnect
  req.on("close", () => {
    for (const { eventName, handler } of listeners) {
      sseEmitter.off(eventName, handler);
    }
  });
});
