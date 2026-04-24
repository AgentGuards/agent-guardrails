"use client";


import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { fetchSiwsNonce, verifySiws } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { useAppToast } from "@/components/toast-context";

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export default function SignInPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useAppToast();
  const { publicKey, signMessage, connected } = useWallet();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const walletAddress = useMemo(() => publicKey?.toBase58() ?? null, [publicKey]);

  const handleSiws = async () => {
    setError(null);
    if (!walletAddress || !connected || !signMessage) {
      setError("Connect a wallet that supports message signing.");
      return;
    }

    setBusy(true);
    try {
      const { message } = await fetchSiwsNonce(walletAddress);
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await signMessage(encodedMessage);
      await verifySiws({
        pubkey: walletAddress,
        message,
        signature: toBase64(signature),
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.session() });
      toast.show("Signed in successfully.", "success");
      router.push("/agents");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "SIWS sign-in failed.";
      setError(message);
      toast.show(message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "48px 20px" }}>
      <div className="card" style={{ display: "grid", gap: 16 }}>
        <h1 className="page-title" style={{ margin: 0 }}>
          Sign in with Solana
        </h1>
        <p className="muted" style={{ margin: 0 }}>
          Authenticate with your wallet to access protected API data via httpOnly session cookies.
        </p>

        <div className="wallet-strip">
          <WalletMultiButton />
        </div>

        <button
          className="button button-primary"
          type="button"
          disabled={!connected || !signMessage || busy}
          onClick={handleSiws}
          style={{ width: "fit-content" }}
        >
          {busy ? "Signing..." : "Sign in (API)"}
        </button>

        {walletAddress ? (
          <div className="mono">Wallet: {walletAddress}</div>
        ) : (
          <div className="muted">Connect a wallet to begin.</div>
        )}

        {error ? <div style={{ color: "#ff6b6b" }}>{error}</div> : null}
      </div>
    </main>

import { AppShell } from "@/components/dashboard-ui";

export default function SignInPage() {
  return (
    <AppShell title="Sign in" subtitle="Authenticate API access with Sign-In With Solana.">
      <div className="card">Sign-in flow will be finalized in Phase 3.</div>
    </AppShell>

  );
}
