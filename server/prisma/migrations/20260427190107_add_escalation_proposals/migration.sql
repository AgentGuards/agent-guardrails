-- CreateTable
CREATE TABLE "escalation_proposals" (
    "id" TEXT NOT NULL,
    "policy_pubkey" TEXT NOT NULL,
    "txn_id" TEXT NOT NULL,
    "squads_multisig" TEXT NOT NULL,
    "target_program" TEXT NOT NULL,
    "amount_lamports" BIGINT NOT NULL,
    "proposal_pda" TEXT,
    "transaction_index" BIGINT,
    "status" TEXT NOT NULL DEFAULT 'awaiting_proposal',
    "approvals" JSONB NOT NULL DEFAULT '[]',
    "rejections" JSONB NOT NULL DEFAULT '[]',
    "executed_txn_sig" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "escalation_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "escalation_proposals_txn_id_key" ON "escalation_proposals"("txn_id");

-- CreateIndex
CREATE INDEX "escalation_proposals_policy_pubkey_status_idx" ON "escalation_proposals"("policy_pubkey", "status");

-- CreateIndex
CREATE INDEX "escalation_proposals_status_updated_at_idx" ON "escalation_proposals"("status", "updated_at");

-- AddForeignKey
ALTER TABLE "escalation_proposals" ADD CONSTRAINT "escalation_proposals_policy_pubkey_fkey" FOREIGN KEY ("policy_pubkey") REFERENCES "policies"("pubkey") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalation_proposals" ADD CONSTRAINT "escalation_proposals_txn_id_fkey" FOREIGN KEY ("txn_id") REFERENCES "guarded_txns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
