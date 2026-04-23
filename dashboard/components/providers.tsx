"use client";

import { useMemo, useState, type ReactNode } from "react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectionProvider, WalletProvider, useWallet } from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { useSSE } from "@/lib/sse/useSSE";

const RPC_ENDPOINT = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

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
  );

  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={RPC_ENDPOINT}>
      <WalletProvider wallets={wallets} autoConnect>
        <QueryClientProvider client={queryClient}>
          <RealtimeBridge />
          {children}
        </QueryClientProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export function useAnchorProvider(): AnchorProvider | null {
  const wallet = useWallet();

  const provider = useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
      return null;
    }

    const connection = new Connection(RPC_ENDPOINT, "confirmed");
    return new AnchorProvider(connection, wallet as ConstructorParameters<typeof AnchorProvider>[1], {
      commitment: "confirmed",
    });
  }, [wallet.publicKey, wallet.signAllTransactions, wallet.signTransaction]);

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
