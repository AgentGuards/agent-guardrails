export function lamportsToSol(value: string | number | bigint): number {
  const lamports = typeof value === "bigint" ? Number(value) : Number(value);
  if (!Number.isFinite(lamports)) {
    return 0;
  }
  return lamports / 1_000_000_000;
}

export function shortenPubkey(pubkey: string, left = 4, right = 4): string {
  if (pubkey.length <= left + right) return pubkey;
  return `${pubkey.slice(0, left)}...${pubkey.slice(-right)}`;
}
