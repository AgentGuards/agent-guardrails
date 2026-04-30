"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { useSiwsAuthStore } from "@/lib/stores/siws-auth";

/** Routes that require wallet connect + SIWS; everything else (e.g. 404) stays reachable. */
function isProtectedDashboardPath(path: string): boolean {
  return (
    path.startsWith("/agents") ||
    path.startsWith("/activity") ||
    path.startsWith("/incidents")
  );
}

function readConnectedPubkey(adapter: ReturnType<typeof useWallet>): string | null {
  try {
    if (adapter.connected && adapter.publicKey) {
      return adapter.publicKey.toBase58();
    }
  } catch {
    /* WalletProvider missing in tests */
  }
  return null;
}

export function RequireSession({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const walletAdapter = useWallet();
  const siwsWallet = useSiwsAuthStore((s) => s.siwsWallet);
  const siwsSignedInAt = useSiwsAuthStore((s) => s.siwsSignedInAt);

  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsub = useSiwsAuthStore.persist.onFinishHydration(() => setHydrated(true));
    void useSiwsAuthStore.persist.rehydrate();
    setHydrated(useSiwsAuthStore.persist.hasHydrated());
    return unsub;
  }, []);

  const connectedPk = readConnectedPubkey(walletAdapter);
  const hasSiwsRecord = Boolean(siwsSignedInAt && siwsWallet);
  const walletReady = Boolean(walletAdapter.connected && connectedPk);
  const siwsOk = hasSiwsRecord && walletReady && connectedPk === siwsWallet;
  const waitingForWallet = hasSiwsRecord && !walletReady;
  const wrongWallet = hasSiwsRecord && walletReady && connectedPk !== siwsWallet;

  useEffect(() => {
    if (!hydrated || !wrongWallet) return;
    useSiwsAuthStore.getState().clearSignedIn();
    router.replace("/");
  }, [hydrated, router, wrongWallet]);

  useEffect(() => {
    if (!hydrated) return;
    if (siwsOk && (pathname === "/" || pathname === "/signin")) {
      router.replace("/agents");
    }
  }, [hydrated, pathname, router, siwsOk]);

  useEffect(() => {
    if (!hydrated) return;
    if (!isProtectedDashboardPath(pathname)) return;
    if (siwsOk || waitingForWallet) return;
    router.replace("/");
  }, [hydrated, pathname, router, siwsOk, waitingForWallet]);

  const protectedPath = isProtectedDashboardPath(pathname);

  if (!hydrated || (protectedPath && waitingForWallet)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07080c] text-zinc-100">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-200"
          role="status"
          aria-label="Loading"
        />
      </div>
    );
  }

  if (
    protectedPath &&
    !siwsOk &&
    !waitingForWallet
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07080c] text-zinc-100">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-200"
          role="status"
          aria-label="Loading"
        />
      </div>
    );
  }

  return <>{children}</>;
}
