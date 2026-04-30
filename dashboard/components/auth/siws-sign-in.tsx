"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "nextjs-toploader/app";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import {
  ApiClientError,
  getErrorMessage,
  requestSiwsNonce,
  verifySiwsSignature,
} from "@/lib/api/client";
import { useSiwsAuthStore } from "@/lib/stores/siws-auth";

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

function WalletIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M16 12h2" />
      <path d="M3 9V7a2 2 0 012-2h12" />
    </svg>
  );
}

function resolveRedirectTarget(from: string | null): string {
  if (from && from.startsWith("/") && !from.startsWith("//")) {
    return from;
  }
  return "/agents";
}

export function SiwsSignIn() {
  const router = useRouter();
  const { publicKey, signMessage, connecting, connected } = useWallet();
  const markSignedIn = useSiwsAuthStore((s) => s.markSignedIn);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSignIn = useCallback(async () => {
    setError(null);
    if (!publicKey || !signMessage) {
      setError("This wallet cannot sign messages. Try another wallet.");
      return;
    }

    const pubkey = publicKey.toBase58();
    setBusy(true);
    try {
      const { message } = await requestSiwsNonce(pubkey);
      const encoded = new TextEncoder().encode(message);
      const signatureBytes = await signMessage(encoded);
      const signature = uint8ArrayToBase64(signatureBytes);
      await verifySiwsSignature({ pubkey, message, signature });
      markSignedIn(pubkey, new Date().toISOString());
      router.replace("/agents");
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  }, [markSignedIn, publicKey, router, signMessage]);

  if (!connected) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {signMessage ? (
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background shadow-sm transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={busy || connecting}
          onClick={() => void onSignIn()}
        >
          <WalletIcon />
          {busy || connecting ? "Signing…" : "Sign in with Solana"}
        </button>
      ) : (
        <p className="text-sm text-amber-500">This wallet does not support message signing.</p>
      )}

      {error ? <p className="text-xs text-crimson-500">{error}</p> : null}
    </div>
  );
}
