"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { AppShell } from "@/components/dashboard-ui";
import { requestSiwsNonce, verifySiwsSignature } from "@/lib/api/client";

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return btoa(binary);
}

export default function SignInPage() {
  const { publicKey, signMessage } = useWallet();
  const [status, setStatus] = useState<string>("Connect a wallet to begin SIWS authentication.");
  const [busy, setBusy] = useState(false);

  async function handleSignIn() {
    if (!publicKey) {
      setStatus("Connect a wallet before signing in.");
      return;
    }

    if (!signMessage) {
      setStatus("This wallet does not support message signing.");
      return;
    }

    setBusy(true);
    try {
      const walletPubkey = publicKey.toBase58();
      const nonce = await requestSiwsNonce(walletPubkey);
      const signatureBytes = await signMessage(new TextEncoder().encode(nonce.message));
      const signature = toBase64(signatureBytes);
      await verifySiwsSignature({ walletPubkey, message: nonce.message, signature });
      setStatus(`Signed in as ${walletPubkey}. Auth cookies are now set for API requests.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Sign in" subtitle="Authenticate API access with Sign-In With Solana.">
      <div className="grid two">
        <div className="card">
          <div className="card-title">SIWS flow</div>
          <p className="muted">
            The dashboard requests a nonce from the server, asks your wallet to sign a message, and verifies
            the signature to establish an httpOnly session cookie.
          </p>
          <div style={{ marginTop: 16 }}>
            <button className="button button-primary" onClick={() => void handleSignIn()} disabled={busy}>
              {busy ? "Signing..." : "Sign in with Solana"}
            </button>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Status</div>
          <p className="muted">{status}</p>
        </div>
      </div>
    </AppShell>
  );
}
