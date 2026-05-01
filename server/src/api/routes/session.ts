// GET /api/session — JWT-backed session metadata for the dashboard.

import express from "express";
import jwt from "jsonwebtoken";
import type { AuthenticatedRequest } from "../middleware/auth.js";

export const sessionRouter: express.Router = express.Router();

sessionRouter.get("/", (req, res) => {
  try {
    const walletPubkey = (req as AuthenticatedRequest).walletPubkey;
    const token = req.cookies?.token as string | undefined;
    let expiresAt: string | null = null;
    if (token) {
      const decoded = jwt.decode(token) as { exp?: number } | null;
      if (decoded?.exp != null) {
        expiresAt = new Date(decoded.exp * 1000).toISOString();
      }
    }

    res.json({
      walletPubkey,
      expiresAt,
    });
  } catch (err) {
    console.error("[api/session] error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
