"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { Bell, Check, Copy, LogOut, UserCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useSiwsAuthStore } from "@/lib/stores/siws-auth";
import { subscribeSSEEvents } from "@/lib/sse/useSSE";

export function ShellNavbarActions() {
  const router = useRouter();
  const walletAdapter = useWallet();
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  let pubkey = "";
  try {
    pubkey = walletAdapter.publicKey?.toBase58() ?? "";
  } catch {
    /* WalletProvider missing */
  }

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (wrapRef.current?.contains(e.target as Node)) return;
      setMenuOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    return subscribeSSEEvents(({ type }) => {
      if (type === "agent_paused" || type === "escalation_created") {
        setUnreadCount((count) => count + 1);
      }
    });
  }, []);

  useEffect(() => {
    return () => {
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
    };
  }, []);

  const copyAddress = useCallback(async () => {
    if (!pubkey || typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      toast.error("Clipboard unavailable");
      return;
    }
    try {
      await navigator.clipboard.writeText(pubkey);
      setCopied(true);
      toast.success("Wallet address copied");
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
      copyResetRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy address");
    }
  }, [pubkey]);

  const signOut = useCallback(() => {
    useSiwsAuthStore.getState().clearSignedIn();
    void walletAdapter.disconnect();
    setMenuOpen(false);
    router.push("/");
  }, [router, walletAdapter]);

  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => {
          setUnreadCount(0);
          router.push("/incidents");
        }}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-md text-zinc-400 transition-colors duration-150 hover:bg-white/[0.06] hover:text-zinc-100"
      >
        <Bell size={20} className="shrink-0" strokeWidth={1.7} />
        {unreadCount > 0 ? (
          <span
            className="absolute right-[6px] top-[6px] h-2.5 w-2.5 rounded-full bg-red-500"
            aria-hidden
          />
        ) : null}
      </button>

      <div className="relative" ref={wrapRef}>
        <button
          type="button"
          aria-label="Account menu"
          aria-expanded={menuOpen}
          aria-haspopup="dialog"
          onClick={() => setMenuOpen((o) => !o)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.06] text-zinc-300 transition-colors duration-150 hover:border-white/[0.16] hover:bg-white/[0.1] hover:text-zinc-100"
        >
          <UserCircle size={20} className="shrink-0" strokeWidth={1.7} aria-hidden />
        </button>

        {menuOpen ? (
          <div
            className="absolute right-0 top-full z-50 mt-2 w-[min(calc(100vw-2rem),20rem)] rounded-xl border border-white/[0.1] bg-zinc-950 p-4 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.85)]"
            role="dialog"
            aria-label="Account"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Connected wallet</p>
            <p className="mt-2 break-all font-mono text-[12px] leading-relaxed text-zinc-200">
              {pubkey || "—"}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                disabled={!pubkey}
                onClick={() => void copyAddress()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-xs font-medium text-zinc-200 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copied ? (
                  <Check size={14} className="shrink-0 text-emerald-400" aria-hidden />
                ) : (
                  <Copy size={14} className="shrink-0" aria-hidden />
                )}
                {copied ? "Copied" : "Copy address"}
              </button>
              <button
                type="button"
                onClick={signOut}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-900/40 bg-red-950/25 px-3 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-950/40"
              >
                <LogOut size={14} className="shrink-0" aria-hidden />
                Sign out
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
