"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/dashboard-ui";
import { QueryError } from "@/components/query-states";
import { SkeletonStatCard } from "@/components/skeletons";
import {
  deleteAuthSessions,
} from "@/lib/api/client";
import { useLlmSettingsQuery } from "@/lib/api/use-llm-settings-query";
import { useOperatorSessionQuery } from "@/lib/api/use-operator-session-query";
import { useWebhookStatusQuery } from "@/lib/api/use-webhook-status-query";
import { clearSiwsAndRedirectHome } from "@/lib/auth/siws-session";
import { useSiwsAuthStore } from "@/lib/stores/siws-auth";
import { formatDateTime } from "@/lib/utils";

export function SettingsView() {
  const router = useRouter();
  const wallet = useWallet();
  const webhookQ = useWebhookStatusQuery();
  const sessionQ = useOperatorSessionQuery();
  const llmQ = useLlmSettingsQuery();

  const loading = webhookQ.isLoading || sessionQ.isLoading || llmQ.isLoading;
  const error = webhookQ.error ?? sessionQ.error ?? llmQ.error;

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

  const connectedPk = wallet.publicKey?.toBase58() ?? "—";

  if (loading) {
    return (
      <AppShell title="Settings" subtitle="Webhook, session, and judge configuration.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            <SkeletonStatCard key={idx} />
          ))}
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="Settings" subtitle="Webhook, session, and judge configuration.">
        <QueryError
          error={error}
          onRetry={() => {
            void webhookQ.refetch();
            void sessionQ.refetch();
            void llmQ.refetch();
          }}
        />
      </AppShell>
    );
  }

  const webhook = webhookQ.data!;
  const session = sessionQ.data!;
  const llm = llmQ.data!;

  return (
    <AppShell title="Settings" subtitle="Webhook, session, and judge configuration.">
      <div className="flex max-w-3xl flex-col gap-8">
        <section className="rounded-xl border border-[#1e1e22] bg-[#111113] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-400">
            Webhook status
          </h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-teal-300/90 break-all">{webhook.webhookUrl}</span>
              <button
                type="button"
                className="rounded-md border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 hover:border-teal-600/60"
                onClick={() => {
                  void navigator.clipboard.writeText(webhook.webhookUrl).then(() => toast.success("URL copied"));
                }}
              >
                Copy URL
              </button>
            </div>
            <div className="flex flex-wrap gap-6 text-xs text-zinc-500">
              <span>
                Last webhook:{" "}
                <span className="font-mono text-zinc-300">
                  {webhook.lastWebhookReceivedAt ? formatDateTime(webhook.lastWebhookReceivedAt) : "never"}
                </span>
              </span>
              <span>
                Events (1h):{" "}
                <span className="font-mono text-zinc-300">{webhook.eventsReceivedLastHour}</span>
              </span>
            </div>
            <div className="rounded-lg border border-teal-900/40 bg-teal-950/20 px-3 py-2 text-[13px] leading-relaxed text-teal-100/90">
              Configure this URL in your Helius dashboard under webhook settings for Enhanced Transactions.
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-[#1e1e22] bg-[#111113] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-400">Active session</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-zinc-500">Connected wallet</dt>
              <dd className="mt-1">
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="break-all font-mono text-sm text-zinc-200">{connectedPk}</span>
                  {connectedPk !== "—" ? (
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard.writeText(connectedPk).then(() => toast.success("Address copied"));
                      }}
                      className="flex-shrink-0 rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                      title="Copy address"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-zinc-500">JWT wallet</dt>
              <dd className="mt-1">
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="break-all font-mono text-sm text-zinc-200">{session.walletPubkey}</span>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard
                        .writeText(session.walletPubkey)
                        .then(() => toast.success("Address copied"));
                    }}
                    className="flex-shrink-0 rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                    title="Copy address"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-zinc-500">Session expires</dt>
              <dd className="mt-1 font-mono text-xs text-zinc-400">
                {session.expiresAt ? formatDateTime(session.expiresAt) : "—"}
              </dd>
            </div>
          </dl>
          <button
            type="button"
            className="mt-4 rounded-md border border-zinc-700 bg-zinc-800/50 px-4 py-2 text-sm text-zinc-300 transition-all duration-150 hover:border-red-500/40 hover:bg-red-500/5 hover:text-red-400"
            onClick={onSignOutSession}
          >
            Sign out
          </button>
        </section>

        <section className="rounded-xl border border-[#1e1e22] bg-[#111113] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-400">
            LLM judge configuration
          </h2>
          <p className="mt-2 text-xs text-zinc-500">Read-only — server-side configuration.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-zinc-800 bg-black/30 p-4">
              <div className="text-[11px] uppercase tracking-wide text-zinc-500">Fast tier (judge)</div>
              <div className="mt-1 font-mono text-sm text-zinc-100">{llm.judgeModel}</div>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-black/30 p-4">
              <div className="text-[11px] uppercase tracking-wide text-zinc-500">Report model</div>
              <div className="mt-1 font-mono text-sm text-zinc-100">{llm.reportModel}</div>
            </div>
          </div>
          {llm.fallbackActive ? (
            <div className="mt-4 rounded-lg border border-amber-900/40 bg-amber-950/25 px-3 py-2 text-sm text-amber-100">
              Rule-based fallback active — no Anthropic API key configured on the server.
            </div>
          ) : (
            <div className="mt-4 text-xs text-teal-400/90">Anthropic API configured — LLM judge enabled.</div>
          )}
        </section>

        <section className="relative rounded-xl border border-[#1e1e22] bg-[#111113] p-5 opacity-95">
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/55 backdrop-blur-[1px]">
            <span className="rounded-full border border-zinc-600 bg-zinc-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-300">
              Coming soon
            </span>
          </div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-400">
            Notification preferences
          </h2>
          <ul className="mt-4 space-y-3 text-sm text-zinc-400">
            <li className="flex items-center justify-between rounded-lg border border-zinc-800/80 px-3 py-2">
              Email on agent pause
              <input type="checkbox" disabled className="opacity-40" />
            </li>
            <li className="flex items-center justify-between rounded-lg border border-zinc-800/80 px-3 py-2">
              Email on escalation created
              <input type="checkbox" disabled className="opacity-40" />
            </li>
            <li className="flex items-center justify-between rounded-lg border border-zinc-800/80 px-3 py-2">
              Daily spend summary
              <input type="checkbox" disabled className="opacity-40" />
            </li>
          </ul>
        </section>

        <section className="rounded-xl border border-red-900/40 bg-red-950/10 p-5 opacity-90 transition-opacity hover:opacity-100">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-red-300">Danger zone</h2>
          <p className="mt-2 text-xs text-zinc-500">
            Revokes server-side SIWS sessions for your wallet and clears the JWT cookie.
          </p>
          <button
            type="button"
            className="mt-4 rounded-lg border border-red-800/70 bg-red-950/30 px-4 py-2 text-sm font-medium text-red-100 hover:bg-red-950/50"
            onClick={() => void onKillAllSessions()}
          >
            Sign out of all sessions
          </button>
        </section>

        <p className="text-xs text-zinc-600">
          Looking for agents? Go to{" "}
          <Link href="/agents" className="text-teal-400 hover:text-teal-300">
            Agents
          </Link>
          .
        </p>
      </div>
    </AppShell>
  );
}
