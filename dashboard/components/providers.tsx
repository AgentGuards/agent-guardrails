"use client";


import { useMemo } from "react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { ConnectionProvider, WalletProvider, useWallet } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { fetchSession } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { useSSE } from "@/lib/sse/useSSE";
import { ToastProvider } from "@/components/toast-context";

export function getProgramId(): PublicKey | null {
  const raw = process.env.NEXT_PUBLIC_GUARDRAILS_PROGRAM_ID;
  if (!raw) return null;
  try {
    return new PublicKey(raw);
  } catch {
    return null;
  }
}

export function useAnchorProvider(): AnchorProvider | null {
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? clusterApiUrl("devnet");

  return useMemo(() => {
    if (!publicKey || !signTransaction || !signAllTransactions) return null;
    const connection = new Connection(endpoint, "confirmed");
    return new AnchorProvider(
      connection,
      { publicKey, signTransaction, signAllTransactions },
      AnchorProvider.defaultOptions(),
    );
  }, [endpoint, publicKey, signAllTransactions, signTransaction]);
}

function SessionHydrator() {
  useQuery({
    queryKey: queryKeys.session(),
    queryFn: fetchSession,
    enabled:
      Boolean(process.env.NEXT_PUBLIC_API_URL) &&
      process.env.NEXT_PUBLIC_USE_MOCK_DATA !== "true",
    retry: false,
    staleTime: 60_000,
  });

  useSSE();

  // Keep this component mounted once at app root.
  return null;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const queryClient = useMemo(

import React, { type ComponentType, useMemo, useState, type ReactNode } from "react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectionProvider, WalletProvider, useWallet } from "@solana/wallet-adapter-react";
import type { Adapter } from "@solana/wallet-adapter-base";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { useSSE } from "@/lib/sse/useSSE";

const RPC_ENDPOINT = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

type SafeConnectionProviderProps = {
  children?: ReactNode;
  endpoint: string;
  config?: ConstructorParameters<typeof Connection>[1];
};

type SafeWalletProviderProps = {
  children?: ReactNode;
  wallets: Adapter[];
  autoConnect?: boolean | ((adapter: Adapter) => Promise<boolean>);
  localStorageKey?: string;
  onError?: (error: unknown, adapter?: Adapter) => void;
};

const SafeConnectionProvider = ConnectionProvider as unknown as ComponentType<SafeConnectionProviderProps>;
const SafeWalletProvider = WalletProvider as unknown as ComponentType<SafeWalletProviderProps>;

function RealtimeBridge(): null {
  useSSE();
  return null;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(

    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),

    [],
  );

  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? clusterApiUrl("devnet");
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    [],
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <SessionHydrator />
              {children}
            </ToastProvider>
          </QueryClientProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

  );

  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);

  return (
    <SafeConnectionProvider endpoint={RPC_ENDPOINT}>
      <SafeWalletProvider wallets={wallets} autoConnect>
        <QueryClientProvider client={queryClient}>
          <RealtimeBridge />
          {children}
        </QueryClientProvider>
      </SafeWalletProvider>
    </SafeConnectionProvider>
  );
}

export function useAnchorProvider(): AnchorProvider | null {
  const wallet = useWallet();
  const { publicKey, signTransaction, signAllTransactions } = wallet;

  const provider = useMemo(() => {
    if (!publicKey || !signTransaction || !signAllTransactions) {
      return null;
    }

    const connection = new Connection(RPC_ENDPOINT, "confirmed");
    return new AnchorProvider(connection, wallet as ConstructorParameters<typeof AnchorProvider>[1], {
      commitment: "confirmed",
    });
  }, [publicKey, signAllTransactions, signTransaction, wallet]);

  return provider;
}

export function getProgramId(): PublicKey | null {
  const value = process.env.NEXT_PUBLIC_GUARDRAILS_PROGRAM_ID;
  if (!value) return null;
  try {
    return new PublicKey(value);
  } catch {
    return null;
  }
}
