-- AlterTable
ALTER TABLE "guarded_txns" ADD COLUMN     "destination" TEXT;

-- CreateTable
CREATE TABLE "spend_trackers" (
    "policy_pubkey" TEXT NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "txn_count_24h" INTEGER NOT NULL,
    "lamports_spent_24h" BIGINT NOT NULL,
    "last_txn_ts" TIMESTAMP(3) NOT NULL,
    "last_txn_program" TEXT NOT NULL,
    "unique_destinations_24h" INTEGER NOT NULL DEFAULT 0,
    "max_single_txn_lamports" BIGINT NOT NULL DEFAULT 0,
    "failed_txn_count_24h" INTEGER NOT NULL DEFAULT 0,
    "unique_programs_24h" SMALLINT NOT NULL DEFAULT 0,
    "lamports_spent_1h" BIGINT NOT NULL DEFAULT 0,
    "window_start_1h" TIMESTAMP(3) NOT NULL,
    "consecutive_high_amount_count" SMALLINT NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spend_trackers_pkey" PRIMARY KEY ("policy_pubkey")
);

-- AddForeignKey
ALTER TABLE "spend_trackers" ADD CONSTRAINT "spend_trackers_policy_pubkey_fkey" FOREIGN KEY ("policy_pubkey") REFERENCES "policies"("pubkey") ON DELETE CASCADE ON UPDATE CASCADE;
