#!/usr/bin/env bash
# deploy-devnet.sh — Build, sync, and deploy the Guardrails program to Solana devnet.
#
# Prerequisites:
#   - Rust 1.75+, Solana CLI 1.18+, Anchor CLI 0.30.1
#   - Devnet SOL in the deploy wallet (~5 SOL for program deployment)
#   - Wallet at ~/.config/solana/id.json (or set ANCHOR_WALLET)
#
# Usage:
#   bash scripts/deploy-devnet.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PROGRAM_DIR="$REPO_ROOT/program"

echo "=== Guardrails Devnet Deployment ==="
echo ""

# Step 1: Verify prerequisites
echo "[1/5] Checking prerequisites..."
command -v anchor >/dev/null 2>&1 || { echo "ERROR: anchor CLI not found. Install via 'avm install 0.30.1'"; exit 1; }
command -v solana >/dev/null 2>&1 || { echo "ERROR: solana CLI not found."; exit 1; }

CLUSTER=$(solana config get | grep "RPC URL" | awk '{print $3}')
echo "  Solana cluster: $CLUSTER"

WALLET=$(solana config get | grep "Keypair Path" | awk '{print $3}')
echo "  Deploy wallet: $WALLET"

BALANCE=$(solana balance --lamports 2>/dev/null | awk '{print $1}')
echo "  Wallet balance: $(echo "scale=4; $BALANCE / 1000000000" | bc) SOL"

if [ "$BALANCE" -lt 3000000000 ]; then
  echo "WARNING: Less than 3 SOL — deployment may fail. Run 'solana airdrop 5' first."
fi
echo ""

# Step 2: Build the program
echo "[2/5] Building Anchor program..."
cd "$PROGRAM_DIR"
anchor build
echo "  Build complete."
echo ""

# Step 3: Sync SDK (copies IDL to sdk/, server, dashboard)
echo "[3/5] Syncing SDK..."
bash "$REPO_ROOT/scripts/sync-sdk.sh"
echo ""

# Step 4: Deploy to devnet
echo "[4/5] Deploying to devnet..."
anchor deploy --provider.cluster devnet
echo "  Deploy complete."
echo ""

# Step 5: Verify deployment and print program ID
echo "[5/5] Verifying deployment..."
PROGRAM_ID=$(solana-keygen pubkey "$PROGRAM_DIR/target/deploy/guardrails-keypair.json")
echo ""
echo "=== Deployment Successful ==="
echo ""
echo "  Program ID: $PROGRAM_ID"
echo ""
echo "  Next steps:"
echo "    1. Set GUARDRAILS_PROGRAM_ID=$PROGRAM_ID in server/.env"
echo "    2. Set NEXT_PUBLIC_GUARDRAILS_PROGRAM_ID=$PROGRAM_ID in dashboard/.env.local"
echo "    3. Configure Helius webhook to watch this program address"
echo "    4. Run 'cd server && npx prisma migrate deploy' for database setup"
echo ""
