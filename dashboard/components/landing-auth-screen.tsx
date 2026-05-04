"use client";

import Image from "next/image";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { ChevronLeft, PenLine, Wallet } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ApiClientError,
  getErrorMessage,
  requestSiwsNonce,
  verifySiwsSignature,
} from "@/lib/api/client";
import { useSiwsAuthStore } from "@/lib/stores/siws-auth";
import { shortAddress } from "@/lib/utils";

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <Image
        src="/logo.png"
        alt="Guardrails logo"
        width={36}
        height={36}
        className="h-9 w-9 shrink-0"
        priority
      />
      <span className="text-[0.8125rem] font-normal leading-snug tracking-[0.14em] text-zinc-100">
        Guardrails
      </span>
    </div>
  );
}

export function LandingAuthScreen() {
  const walletAdapter = useWallet();
  const { setVisible } = useWalletModal();
  const markSignedIn = useSiwsAuthStore((s) => s.markSignedIn);
  const { publicKey, signMessage, connecting, connected, disconnect } = walletAdapter;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openConnect = useCallback(() => {
    if (!walletAdapter.wallet) {
      setVisible(true);
      return;
    }
    void walletAdapter.connect().catch(() => {
      /* user cancelled */
    });
  }, [setVisible, walletAdapter]);

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
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  }, [markSignedIn, publicKey, signMessage]);

  const onBackToStepOne = useCallback(() => {
    setError(null);
    useSiwsAuthStore.getState().clearSignedIn();
    void disconnect().catch(() => {
      /* wallet disconnect cancelled/failed */
    });
  }, [disconnect]);

  let connectedLabel = "Connect";
  try {
    if (walletAdapter.connected && walletAdapter.publicKey) {
      const a = shortAddress(walletAdapter.publicKey.toBase58(), 4, 4);
      connectedLabel = a;
    }
  } catch {
    /* ok */
  }

  return (
    <main className="min-h-screen bg-black text-zinc-100">
      <header className="flex items-center justify-between border-b border-zinc-800/80 px-6 py-4 sm:px-10">
        <BrandMark />
      </header>

      <div className="flex min-h-[calc(100vh-61px)] items-center justify-center px-4 py-8 sm:px-8 sm:py-12">
        <div className="relative flex w-full min-h-[42vh] max-w-[min(100%,56rem)] flex-col items-center justify-center rounded-2xl bg-[#121212] px-6 py-10 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset] sm:px-10 sm:py-12 md:px-12 md:py-14 lg:px-14">

          {!connected ? (
            <div className="flex w-full max-w-2xl flex-col items-center  text-center">
              <span className="rounded-full border border-zinc-700/80 bg-zinc-900/50 px-3 py-1 text-xs font-medium text-zinc-400">
                Step 1 of 2
              </span>
              <h1 className="mt-5 text-2xl font-semibold leading-snug tracking-tight text-white sm:text-3xl md:text-4xl">
                Connect your wallet
              </h1>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-zinc-400 sm:text-base">
                After you connect, you&apos;ll sign a short message off-chain to unlock the dashboard.
              </p>
              <Button
                type="button"
                disabled={connecting}
                onClick={() => openConnect()}
                size="lg"
                className="mt-10 inline-flex items-center gap-3 rounded-xl bg-white px-8 py-4 text-base font-semibold text-black shadow-sm transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Wallet size={22} strokeWidth={1.8} className="text-zinc-900" aria-hidden />
                {connecting ? "Connecting…" : "Connect wallet"}
              </Button>
            </div>
          ) : (
            <div className="flex w-full max-w-2xl flex-col items-center text-center">
              <Button
                type="button"
                variant="ghost"
                className="absolute left-5 top-5 h-auto w-fit px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200 sm:left-7 sm:top-6"
                onClick={onBackToStepOne}
                disabled={busy || connecting}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                Back
              </Button>
              <div className="mb-4 flex w-full justify-center">
                <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-200">
                  Step 2 of 2
                </span>
              </div>
              <h1 className="mt-2 text-2xl font-semibold leading-snug tracking-tight text-white sm:text-3xl md:text-4xl">
                Sign in with Solana
              </h1>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-zinc-400 sm:text-base">
                Approve the signature request in your wallet. This confirms you own the address.
              </p>
              <p className="mt-4 inline-flex items-center gap-2 rounded-lg border border-zinc-700/60 bg-zinc-900/40 px-3 py-2 font-mono text-xs text-zinc-300 sm:text-sm">
                <span className="text-zinc-500">Connected</span>
                <span className="text-zinc-200">{connectedLabel}</span>
              </p>

              {signMessage ? (
                <Button
                  type="button"
                  disabled={busy || connecting}
                  onClick={() => void onSignIn()}
                  size="lg"
                  className="mt-10 inline-flex items-center gap-3 rounded-xl bg-white px-8 py-4 text-base font-semibold text-black shadow-sm transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <PenLine size={22} strokeWidth={1.8} className="text-zinc-900" aria-hidden />
                  {busy || connecting ? "Signing…" : "Sign message & continue"}
                </Button>
              ) : (
                <p className="mt-6 text-sm text-amber-500">This wallet does not support message signing.</p>
              )}

              {error ? <p className="mt-4 max-w-md text-xs text-red-400">{error}</p> : null}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
