"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";
import { AppShell } from "@/components/dashboard-ui";
import { queryKeys } from "@/lib/api/query-keys";
import { requestSiwsNonce, verifySiwsSignature } from "@/lib/api/client";
import { uint8ArrayToBase64 } from "@/lib/crypto/base64";

export default function SignInPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { publicKey, signMessage } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const walletPubkey = useMemo(() => publicKey?.toBase58() ?? null, [publicKey]);

  async function handleSignIn(): Promise<void> {
    setError(null);
    setSuccess(null);

    if (!walletPubkey) {
      setError("Connect a wallet first, then retry SIWS.");
      return;
    }

    if (!signMessage) {
      setError("This wallet does not support message signing.");
      return;
    }

    setIsLoading(true);
    try {
      const { message } = await requestSiwsNonce(walletPubkey);
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await signMessage(encodedMessage);
      const signatureBase64 = uint8ArrayToBase64(signature);

      await verifySiwsSignature({
        walletPubkey,
        message,
        signature: signatureBase64,
      });

      await queryClient.invalidateQueries({ queryKey: queryKeys.session() });

      setSuccess("Signed in successfully. Redirecting to dashboard...");
      router.push("/");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to complete SIWS sign in.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AppShell title="Sign in" subtitle="Authenticate API access with Sign-In With Solana.">
      <div className="card" style={{ display: "grid", gap: 12 }}>
        <div>
          {walletPubkey ? (
            <>Connected wallet: <span className="mono">{walletPubkey}</span></>
          ) : (
            "No wallet connected. Use the wallet control in the top bar first."
          )}
        </div>
        <button className="button button-primary" type="button" onClick={handleSignIn} disabled={isLoading}>
          {isLoading ? "Signing message..." : "Sign in with Solana"}
        </button>
        {success ? <div className="muted">{success}</div> : null}
        {error ? <div style={{ color: "#ff6b6b" }}>{error}</div> : null}
      </div>
    </AppShell>
  );
}
