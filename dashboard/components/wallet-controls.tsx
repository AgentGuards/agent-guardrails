"use client";

import { useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { shortAddress } from "@/lib/utils";

export function WalletControls() {
  const {
    wallets,
    wallet,
    connected,
    publicKey,
    connect,
    disconnect,
    select,
    connecting,
  } = useWallet();

  const installedWallets = useMemo(
    () => wallets.filter((entry) => entry.readyState !== "Unsupported"),
    [wallets],
  );

  if (connected && publicKey) {
    return (
      <div className="wallet-strip">
        <span className="chip chip-green">{shortAddress(publicKey.toBase58(), 4, 4)}</span>
        <button className="button button-secondary" onClick={() => void disconnect()}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="wallet-strip">
      <select
        className="input select-inline"
        value={wallet?.adapter.name ?? ""}
        onChange={(event) => {
          if (event.target.value) {
            select(event.target.value);
          }
        }}
      >
        <option value="">Select wallet</option>
        {installedWallets.map((entry) => (
          <option key={entry.adapter.name} value={entry.adapter.name}>
            {entry.adapter.name}
          </option>
        ))}
      </select>
      <button className="button button-primary" disabled={!wallet || connecting} onClick={() => void connect()}>
        {connecting ? "Connecting..." : "Connect wallet"}
      </button>
    </div>
  );
}
