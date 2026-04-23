"use client";

import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSession, logoutSession } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { apiBaseUrl, isMockApiRuntime } from "@/lib/api/runtime";
import { shortAddress } from "@/lib/utils";

export function WalletControls() {
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();
  const httpApi = Boolean(apiBaseUrl()) && !isMockApiRuntime();

  const { data: session, isFetched } = useQuery({
    queryKey: queryKeys.session(),
    queryFn: fetchSession,
    enabled: httpApi,
    staleTime: 60_000,
    retry: 1,
  });

  const logout = useMutation({
    mutationFn: logoutSession,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.session() });
    },
  });

  const connected = publicKey?.toBase58() ?? null;
  const sessionWallet = session?.walletPubkey ?? null;

  return (
    <div className="wallet-strip" style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
      <WalletMultiButton />
      {httpApi && connected && isFetched && !sessionWallet ? (
        <Link href="/signin" className="button button-secondary">
          Sign in (API)
        </Link>
      ) : null}
      {httpApi && sessionWallet ? (
        <>
          <span className="muted mono" title={sessionWallet}>
            API {shortAddress(sessionWallet, 4, 4)}
          </span>
          <button
            type="button"
            className="button button-secondary"
            disabled={logout.isPending}
            onClick={() => {
              logout.mutate();
            }}
          >
            {logout.isPending ? "Signing out…" : "Sign out"}
          </button>
        </>
      ) : null}
    </div>
  );
}
