"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { Check, Copy, LogOut, Shield, Bell } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/dashboard-ui";
import { QueryError } from "@/components/query-states";
import { SkeletonStatCard } from "@/components/skeletons";
import { deleteAuthSessions } from "@/lib/api/client";
import { useOperatorSessionQuery } from "@/lib/api/use-operator-session-query";
import { clearSiwsAndRedirectHome } from "@/lib/auth/siws-session";
import { useSiwsAuthStore } from "@/lib/stores/siws-auth";
import { formatDateTime } from "@/lib/utils";

function CopyInline({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          toast.success("Copied");
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="inline-flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[10px] font-medium text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
    >
      {copied ? <Check size={10} /> : <Copy size={10} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function SettingsView() {
  const router = useRouter();
  const wallet = useWallet();
  const sessionQ = useOperatorSessionQuery();

  const loading = sessionQ.isLoading;
  const error = sessionQ.error;

  const onSignOutSession = () => {
    useSiwsAuthStore.getState().clearSignedIn();
    void wallet.disconnect().catch(() => {});
    clearSiwsAndRedirectHome((path) => router.replace(path));
  };

  const onKillAllSessions = async () => {
    try {
      await deleteAuthSessions();
      useSiwsAuthStore.getState().clearSignedIn();
      await wallet.disconnect().catch(() => {});
      toast.success("Signed out of all sessions");
      router.replace("/");
    } catch (e) {
      toast.error("Could not revoke sessions");
      console.error(e);
    }
  };

  const connectedPk = wallet.publicKey?.toBase58() ?? "";

  if (loading) {
    return (
      <AppShell title="Settings">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 3 }).map((_, idx) => (
            <SkeletonStatCard key={idx} />
          ))}
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="Settings">
        <QueryError error={error} onRetry={() => void sessionQ.refetch()} />
      </AppShell>
    );
  }

  const session = sessionQ.data!;

  return (
    <AppShell title="Settings">
      <div className="flex max-w-3xl flex-col gap-6">

        {/* ── Active Session ── */}
        <div
          className="overflow-hidden rounded-xl border border-[#1e1e22] bg-[#111113] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
          style={{ animation: "fade-in-up 0.4s ease-out 0.05s backwards" }}
        >
          <div className="flex items-center gap-3 border-b border-white/[0.05] px-5 py-3.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-teal-500/20 bg-teal-500/10">
              <Shield size={14} className="text-teal-400" />
            </div>
            <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Active Session</span>
          </div>
          <div className="space-y-4 p-5">
            {/* Connected wallet */}
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Connected Wallet</div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full bg-teal-500 shadow-[0_0_6px_rgba(0,255,209,0.4)]" />
                <span className="min-w-0 flex-1 break-all font-mono text-[12px] text-zinc-200">{connectedPk || "—"}</span>
                {connectedPk && <CopyInline text={connectedPk} />}
              </div>
            </div>

            {/* JWT wallet */}
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Session Wallet (JWT)</div>
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 break-all font-mono text-[12px] text-zinc-200">{session.walletPubkey}</span>
                <CopyInline text={session.walletPubkey} />
              </div>
            </div>

            {/* Expiry */}
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Session Expires</div>
              <div className="font-mono text-[12px] text-zinc-300">
                {session.expiresAt ? formatDateTime(session.expiresAt) : "—"}
              </div>
            </div>

            {/* Sign out */}
            <button
              type="button"
              onClick={onSignOutSession}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] py-2.5 text-[12px] font-medium text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
            >
              <LogOut size={13} />
              Sign out of this session
            </button>
          </div>
        </div>

        {/* ── Notification Preferences ── */}
        <div
          className="relative overflow-hidden rounded-xl border border-[#1e1e22] bg-[#111113] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
          style={{ animation: "fade-in-up 0.4s ease-out 0.1s backwards" }}
        >
          {/* Coming soon overlay */}
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/60 backdrop-blur-[1px]">
            <span className="rounded-full border border-zinc-600 bg-zinc-900 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-300">
              Coming soon
            </span>
          </div>

          <div className="flex items-center gap-3 border-b border-white/[0.05] px-5 py-3.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04]">
              <Bell size={14} className="text-zinc-400" />
            </div>
            <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Notifications</span>
          </div>
          <div className="space-y-2 p-5">
            {[
              { label: "Email on agent pause", desc: "Get notified when any agent is paused by Guardian or manually" },
              { label: "Email on escalation created", desc: "Alert when a transaction is escalated to Squads multisig" },
              { label: "Daily spend summary", desc: "Receive a daily digest of spend across all agents" },
            ].map((item) => (
              <label key={item.label} className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] px-4 py-3 transition-colors hover:border-white/[0.1]">
                <input type="checkbox" disabled className="mt-0.5 opacity-40" />
                <div>
                  <div className="text-[12px] font-medium text-zinc-300">{item.label}</div>
                  <div className="mt-0.5 text-[10px] text-zinc-600">{item.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* ── Danger Zone ── */}
        <div
          className="overflow-hidden rounded-xl border border-red-900/20 bg-red-950/[0.04] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
          style={{ animation: "fade-in-up 0.4s ease-out 0.15s backwards" }}
        >
          <div className="flex items-center gap-3 border-b border-red-900/15 px-5 py-3.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10">
              <LogOut size={14} className="text-red-400" />
            </div>
            <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-red-400/70">Danger Zone</span>
          </div>
          <div className="p-5">
            <p className="mb-4 text-[12px] leading-relaxed text-zinc-500">
              Revokes all server-side SIWS sessions for your wallet and clears the JWT cookie. You will need to sign in again on every device.
            </p>
            <button
              type="button"
              onClick={() => void onKillAllSessions()}
              className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-600 px-4 py-2 text-[12px] font-semibold text-white shadow-[0_0_12px_rgba(239,68,68,0.15)] transition-all hover:bg-red-500"
            >
              <LogOut size={13} />
              Sign out of all sessions
            </button>
          </div>
        </div>

      </div>
    </AppShell>
  );
}
