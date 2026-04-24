"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { shortAddress } from "@/lib/utils";

export function WalletControls() {
  const { publicKey } = useWallet();
  const wallet = publicKey ? shortAddress(publicKey.toBase58(), 4, 4) : "7xKX...gAsU";
  return (
    <div className="wallet-strip flex items-center gap-2">
      <span className="status-pill">
        <span className="status-dot" />
        Monitor online
      </span>
      <span className="wallet-pill">{wallet}</span>
    </div>
  );
}
