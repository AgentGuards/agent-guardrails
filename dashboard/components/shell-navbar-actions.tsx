"use client";

import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { ArrowRight, Bell, Check, Copy, LogOut, UserCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useSiwsAuthStore } from "@/lib/stores/siws-auth";
import { subscribeSSEEvents } from "@/lib/sse/useSSE";
import { useRecentIncidentsQuery } from "@/lib/api/use-recent-incidents-query";
import { formatRelativeTime, policyLabel, shortAddress } from "@/lib/utils";

export function ShellNavbarActions() {
  const walletAdapter = useWallet();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifsRef = useRef<HTMLDivElement>(null);
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const incidentsQuery = useRecentIncidentsQuery(5);
  const incidents = incidentsQuery.data?.items ?? [];

  let pubkey = "";
  try {
    pubkey = walletAdapter.publicKey?.toBase58() ?? "";
  } catch {
    /* WalletProvider missing */
  }

  // Click outside — user menu
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
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

  // Click outside — notifications
  useEffect(() => {
    if (!notifsOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (notifsRef.current?.contains(e.target as Node)) return;
      setNotifsOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNotifsOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [notifsOpen]);

  // SSE subscription for unread count
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
  }, [walletAdapter]);

  return (
    <div className="flex shrink-0 items-center gap-2">

      {/* ── Notification Bell ── */}
      <div className="relative" ref={notifsRef}>
        <button
          type="button"
          aria-label="Notifications"
          onClick={() => {
            setNotifsOpen((o) => !o);
            if (!notifsOpen) setUnreadCount(0);
          }}
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-md text-zinc-400 transition-colors duration-150 hover:bg-white/[0.06] hover:text-zinc-100"
        >
          <Bell size={20} className="shrink-0" strokeWidth={1.7} />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-[#111114] bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {notifsOpen && (
          <div
            className="absolute right-0 top-full z-50 mt-2 w-[min(calc(100vw-2rem),22rem)] overflow-hidden rounded-xl border border-white/[0.08] bg-zinc-950 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)]"
            role="dialog"
            aria-label="Notifications"
          >
            {/* Accent bar */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-teal-500/40 to-transparent" />

            <div className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                  Recent Incidents
                </h3>
                {incidents.length > 0 && (
                  <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                    {incidents.length}
                  </span>
                )}
              </div>

              {incidents.length === 0 ? (
                <p className="py-4 text-center text-xs text-zinc-500">No incidents yet</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {incidents.map((inc) => (
                    <Link
                      key={inc.id}
                      href={`/incidents/${inc.id}`}
                      onClick={() => setNotifsOpen(false)}
                      className="group flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-white/[0.04]"
                    >
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          inc.resolvedAt
                            ? "bg-teal-500 shadow-[0_0_6px_hsl(169_100%_50%/0.3)]"
                            : "bg-amber-500 shadow-[0_0_6px_hsl(39_100%_59%/0.3)]"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[12px] font-medium text-zinc-200 group-hover:text-white">
                            {policyLabel(inc.policyPubkey)}
                          </span>
                          <span className="whitespace-nowrap font-mono text-[10px] text-zinc-600">
                            {formatRelativeTime(inc.pausedAt)}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                          {inc.reason}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              <div className="mt-3 border-t border-white/[0.06] pt-3">
                <Link
                  href="/incidents"
                  onClick={() => setNotifsOpen(false)}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[11px] font-medium text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-zinc-100"
                >
                  View all incidents
                  <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── User Menu ── */}
      <div className="relative" ref={menuRef}>
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

        {menuOpen && (
          <div
            className="absolute right-0 top-full z-50 mt-2 w-[min(calc(100vw-2rem),20rem)] overflow-hidden rounded-xl border border-white/[0.08] bg-zinc-950 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)]"
            role="dialog"
            aria-label="Account"
          >
            {/* Accent bar */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-teal-500/40 to-transparent" />

            <div className="p-5">
              {/* Avatar + label */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-teal-500/20 bg-teal-500/10 text-sm font-bold text-teal-400">
                  {pubkey ? pubkey.slice(0, 2) : "?"}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    Connected wallet
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[12px] text-zinc-200">
                    {pubkey ? shortAddress(pubkey, 8, 6) : "—"}
                  </p>
                </div>
              </div>

              {/* Full address */}
              <div className="mt-4 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                <p className="break-all font-mono text-[11px] leading-relaxed text-zinc-400">
                  {pubkey || "—"}
                </p>
              </div>

              {/* Actions */}
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  disabled={!pubkey}
                  onClick={() => void copyAddress()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
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
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-900/30 bg-red-950/20 px-3 py-2.5 text-xs font-semibold text-red-300 transition-colors hover:bg-red-950/35 hover:text-red-200"
                >
                  <LogOut size={14} className="shrink-0" aria-hidden />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
