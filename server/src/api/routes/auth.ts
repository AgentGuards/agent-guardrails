// SIWS (Sign In With Solana) authentication routes.
// POST /auth/siws/nonce — generate nonce + message
// POST /auth/siws/verify — verify Ed25519 signature, issue JWT, set httpOnly cookie

import { randomBytes } from "node:crypto";
import express from "express";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import nacl from "tweetnacl";
import { prisma } from "../../db/client.js";
import { env } from "../../config/env.js";

export const authRouter: express.Router = express.Router();

const JWT_EXPIRY = "24h";
const NONCE_EXPIRY_MINUTES = 10;

// Rate limit nonce endpoint — 5 requests per minute per IP
const nonceLimiter = rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many nonce requests, try again later" },
});

// ---------------------------------------------------------------------------
// POST /auth/siws/nonce
// ---------------------------------------------------------------------------

authRouter.post("/siws/nonce", nonceLimiter, async (req, res) => {
  try {
    const { pubkey } = req.body as { pubkey?: string };

    if (!pubkey || typeof pubkey !== "string") {
      res.status(400).json({ error: "pubkey is required" });
      return;
    }

    const nonce = randomBytes(32).toString("base64");
    const expiresAt = new Date(Date.now() + NONCE_EXPIRY_MINUTES * 60_000);

    await prisma.authSession.create({
      data: {
        walletPubkey: pubkey,
        nonce,
        expiresAt,
      },
    });

    const domain = env.CORS_ORIGIN;
    const message = `Sign this message to authenticate with Agent Guardrails.\n\nDomain: ${domain}\nChain: solana:devnet\nWallet: ${pubkey}\nNonce: ${nonce}`;

    res.json({ nonce, message });
  } catch (err) {
    console.error("[auth/nonce] error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// POST /auth/siws/verify
// ---------------------------------------------------------------------------

authRouter.post("/siws/verify", async (req, res) => {
  try {
    const { pubkey, signature, message } = req.body as {
      pubkey?: string;
      signature?: string;
      message?: string;
    };

    if (!pubkey || !signature || !message) {
      res.status(400).json({ error: "pubkey, signature, and message are required" });
      return;
    }

    // Extract nonce from the message
    const nonceMatch = message.match(/Nonce: (.+)$/m);
    if (!nonceMatch) {
      res.status(400).json({ error: "Invalid message format" });
      return;
    }
    const nonce = nonceMatch[1];

    // Verify Ed25519 signature first (before touching DB)
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = Buffer.from(signature, "base64");
    const pubkeyBuffer = decodeBase58(pubkey);

    const valid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      pubkeyBuffer,
    );

    if (!valid) {
      res.status(401).json({ error: "Invalid signature" });
      return;
    }

    // Atomically claim the session — updateMany with signedAt: null prevents
    // TOCTOU race where two concurrent requests claim the same nonce.
    const [claimed, policiesCount] = await Promise.all([prisma.authSession.updateMany({
      where: {
        walletPubkey: pubkey,
        nonce,
        signedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { signedAt: new Date() },
    }), prisma.policy.count({
      where: {
        owner: pubkey,
      },
    })]);

    if (claimed.count === 0) {
      res.status(401).json({ error: "Invalid or expired nonce" });
      return;
    }

    // Issue JWT
    const token = jwt.sign({ walletPubkey: pubkey }, env.JWT_SECRET, {
      expiresIn: JWT_EXPIRY,
    });

    // Set httpOnly cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    res.json({ ok: true, policiesCount });
  } catch (err) {
    console.error("[auth/verify] error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// DELETE /auth/sessions — revoke SIWS sessions server-side + clear JWT cookie
// (runs without auth middleware; verifies JWT from cookie explicitly).
// ---------------------------------------------------------------------------

authRouter.delete("/sessions", async (req, res) => {
  try {
    const token = req.cookies?.token as string | undefined;
    if (!token) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    let walletPubkey: string;
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as { walletPubkey: string };
      walletPubkey = payload.walletPubkey;
    } catch {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    await prisma.authSession.deleteMany({
      where: { walletPubkey },
    });

    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("[auth/sessions DELETE] error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// Base58 decoder (for Solana pubkeys)
// ---------------------------------------------------------------------------

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function decodeBase58(str: string): Uint8Array {
  const bytes: number[] = [0];
  for (const char of str) {
    const idx = BASE58_ALPHABET.indexOf(char);
    if (idx === -1) throw new Error(`Invalid base58 character: ${char}`);
    let carry = idx;
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  // Leading zeros
  for (const char of str) {
    if (char !== "1") break;
    bytes.push(0);
  }
  return Uint8Array.from(bytes.reverse());
}
