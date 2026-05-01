// API router — REST endpoints + SSE stream + SIWS auth for the dashboard.

import express from "express";
import { authMiddleware } from "./middleware/auth.js";
import { transactionsRouter } from "./routes/transactions.js";
import { incidentsRouter } from "./routes/incidents.js";
import { escalationsRouter } from "./routes/escalations.js";
import { policiesRouter } from "./routes/policies.js";
import { fleetRouter } from "./routes/fleet.js";
import { spendTrackersRouter } from "./routes/spend-trackers.js";
import { eventsRouter } from "./routes/events.js";
import { authRouter } from "./routes/auth.js";
import { sessionRouter } from "./routes/session.js";
import { settingsRouter } from "./routes/settings.js";
import { auditRouter } from "./routes/audit.js";

export const apiRouter: express.Router = express.Router();

// Auth middleware — skips /auth/* routes internally
apiRouter.use(authMiddleware);

// Auth routes (no JWT required)
apiRouter.use("/auth", authRouter);

// Protected REST routes
apiRouter.use("/transactions", transactionsRouter);
apiRouter.use("/incidents", incidentsRouter);
apiRouter.use("/escalations", escalationsRouter);
apiRouter.use("/policies", policiesRouter);
apiRouter.use("/fleet", fleetRouter);
apiRouter.use("/spend-trackers", spendTrackersRouter);
apiRouter.use("/session", sessionRouter);
apiRouter.use("/settings", settingsRouter);
apiRouter.use("/audit", auditRouter);

// SSE stream
apiRouter.use("/events", eventsRouter);
