/**
 * Mock guarded_txns — mirrors `guarded_txns` table (server/prisma/schema.prisma)
 *
 * Narrative:
 * - Yield Bot: 8 normal Jupiter swaps over the day
 * - Staking Agent: 4 normal Marinade operations
 * - Alpha Scanner: 3 normal, then 5 burst txns (last triggers pause)
 */

export interface GuardedTxn {
  id: string;
  policyPubkey: string;
  txnSig: string;
  slot: number;
  blockTime: string; // ISO 8601
  targetProgram: string;
  amountLamports: number | null;
  status: "executed" | "rejected" | "escalated";
  rejectReason: string | null;
  rawEvent: Record<string, unknown>;
  createdAt: string;
}

// Policy pubkeys from policies.ts
const YIELD_BOT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const STAKING_AGENT = "8dHEsGNtQ2obTBbh8mxmXJ3A6stUdmKz1KfLFbm2WDNG";
const ALPHA_SCANNER = "CsZ5LZkDS7h9TDKjt4zMJSiP8bZzYLkWsa4bGMQKDqeE";

const JUPITER = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";
const MARINADE = "MrNEdFKsp4MSGPoQwnZqSxUYEbBYaxQGTdCSg1vmDVJ";
const SYSTEM = "11111111111111111111111111111111";
const UNKNOWN_PROGRAM = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";

export const TRANSACTIONS: GuardedTxn[] = [
  // === Yield Bot — normal Jupiter swaps ===
  {
    id: "a1b2c3d4-0001-4000-8000-000000000001",
    policyPubkey: YIELD_BOT,
    txnSig: "5UfDuX8qXn3bP6vR2c4d8wKL2NhU9tCmfvA7z3Qx1YjEFbGn8WkT4RpJ6sN7mV5aH3qL9wX2cF8bD4kM1nP3rS",
    slot: 285_000_100,
    blockTime: "2026-04-21T09:00:12Z",
    targetProgram: JUPITER,
    amountLamports: 1_500_000_000,
    status: "executed",
    rejectReason: null,
    rawEvent: {},
    createdAt: "2026-04-21T09:00:13Z",
  },
  {
    id: "a1b2c3d4-0001-4000-8000-000000000002",
    policyPubkey: YIELD_BOT,
    txnSig: "3KmPqW9vR4sT7bN2cF5dA8xL6jH1gE4kM3nQ7wY9zU2rV5tX8aJ6pD4sB1fC3hG7mK9qL2wN5xR8yT4vE6jA",
    slot: 285_000_450,
    blockTime: "2026-04-21T09:15:30Z",
    targetProgram: JUPITER,
    amountLamports: 800_000_000,
    status: "executed",
    rejectReason: null,
    rawEvent: {},
    createdAt: "2026-04-21T09:15:31Z",
  },
  {
    id: "a1b2c3d4-0001-4000-8000-000000000003",
    policyPubkey: YIELD_BOT,
    txnSig: "2NfGhJ7kL8mP9qR3sT4vW5xY6zA1bC2dE3fH4jK5nQ6rS7tU8wV9xA1bC2dE3fG4hJ5kL6mN7pQ8rS9tU",
    slot: 285_001_200,
    blockTime: "2026-04-21T10:30:45Z",
    targetProgram: JUPITER,
    amountLamports: 2_200_000_000,
    status: "executed",
    rejectReason: null,
    rawEvent: {},
    createdAt: "2026-04-21T10:30:46Z",
  },
  {
    id: "a1b2c3d4-0001-4000-8000-000000000004",
    policyPubkey: YIELD_BOT,
    txnSig: "4PqR5sT6vW7xY8zA9bC1dE2fG3hJ4kL5mN6pQ7rS8tU9wV1xA2bC3dE4fG5hJ6kL7mN8pQ9rS1tU2wV3xA",
    slot: 285_002_000,
    blockTime: "2026-04-21T11:45:00Z",
    targetProgram: JUPITER,
    amountLamports: 3_100_000_000,
    status: "executed",
    rejectReason: null,
    rawEvent: {},
    createdAt: "2026-04-21T11:45:01Z",
  },
  {
    id: "a1b2c3d4-0001-4000-8000-000000000005",
    policyPubkey: YIELD_BOT,
    txnSig: "5RsT6vW7xY8zA9bC1dE2fG3hJ4kL5mN6pQ7rS8tU9wV1xA2bC3dE4fG5hJ6kL7mN8pQ9rS1tU2wV3xA4bC",
    slot: 285_002_800,
    blockTime: "2026-04-21T12:30:20Z",
    targetProgram: JUPITER,
    amountLamports: 950_000_000,
    status: "executed",
    rejectReason: null,
    rawEvent: {},
    createdAt: "2026-04-21T12:30:21Z",
  },
  {
    id: "a1b2c3d4-0001-4000-8000-000000000006",
    policyPubkey: YIELD_BOT,
    txnSig: "6TuV7wX8yZ9aB1cD2eF3gH4jK5lM6nP7qR8sT9uV1wX2yZ3aB4cD5eF6gH7jK8lM9nP1qR2sT3uV4wX5yZ",
    slot: 285_003_500,
    blockTime: "2026-04-21T13:15:10Z",
    targetProgram: JUPITER,
    amountLamports: 1_800_000_000,
    status: "executed",
    rejectReason: null,
    rawEvent: {},
    createdAt: "2026-04-21T13:15:11Z",
  },
  {
    id: "a1b2c3d4-0001-4000-8000-000000000007",
    policyPubkey: YIELD_BOT,
    txnSig: "7UvW8xY9zA1bC2dE3fG4hJ5kL6mN7pQ8rS9tU1wV2xA3bC4dE5fG6hJ7kL8mN9pQ1rS2tU3wV4xA5bC6dE",
    slot: 285_004_200,
    blockTime: "2026-04-21T14:00:55Z",
    targetProgram: JUPITER,
    amountLamports: 2_500_000_000,
    status: "executed",
    rejectReason: null,
    rawEvent: {},
    createdAt: "2026-04-21T14:00:56Z",
  },
  {
    id: "a1b2c3d4-0001-4000-8000-000000000008",
    policyPubkey: YIELD_BOT,
    txnSig: "8VwX9yZ1aB2cD3eF4gH5jK6lM7nP8qR9sT1uV2wX3yZ4aB5cD6eF7gH8jK9lM1nP2qR3sT4uV5wX6yZ7aB",
    slot: 285_005_000,
    blockTime: "2026-04-21T14:45:30Z",
    targetProgram: SYSTEM,
    amountLamports: 500_000_000,
    status: "executed",
    rejectReason: null,
    rawEvent: {},
    createdAt: "2026-04-21T14:45:31Z",
  },

  // === Staking Agent — normal Marinade operations ===
  {
    id: "b2c3d4e5-0001-4000-8000-000000000001",
    policyPubkey: STAKING_AGENT,
    txnSig: "2AbC3dEf4gHj5kLm6nPq7rSt8uVw9xYz1AbC2dEf3gHj4kLm5nPq6rSt7uVw8xYz9AbC1dEf2gHj3kLm",
    slot: 285_000_200,
    blockTime: "2026-04-21T09:05:00Z",
    targetProgram: MARINADE,
    amountLamports: 5_000_000_000,
    status: "executed",
    rejectReason: null,
    rawEvent: {},
    createdAt: "2026-04-21T09:05:01Z",
  },
  {
    id: "b2c3d4e5-0001-4000-8000-000000000002",
    policyPubkey: STAKING_AGENT,
    txnSig: "3BcD4eF5gH6jK7lM8nP9qR1sT2uV3wX4yZ5aB6cD7eF8gH9jK1lM2nP3qR4sT5uV6wX7yZ8aB9cD1eF",
    slot: 285_001_800,
    blockTime: "2026-04-21T10:45:00Z",
    targetProgram: MARINADE,
    amountLamports: 8_000_000_000,
    status: "executed",
    rejectReason: null,
    rawEvent: {},
    createdAt: "2026-04-21T10:45:01Z",
  },
  {
    id: "b2c3d4e5-0001-4000-8000-000000000003",
    policyPubkey: STAKING_AGENT,
    txnSig: "4CdE5fG6hJ7kL8mN9pQ1rS2tU3wV4xA5bC6dE7fG8hJ9kL1mN2pQ3rS4tU5wV6xA7bC8dE9fG1hJ2kL",
    slot: 285_003_100,
    blockTime: "2026-04-21T12:50:00Z",
    targetProgram: MARINADE,
    amountLamports: 3_000_000_000,
    status: "executed",
    rejectReason: null,
    rawEvent: {},
    createdAt: "2026-04-21T12:50:01Z",
  },
  {
    id: "b2c3d4e5-0001-4000-8000-000000000004",
    policyPubkey: STAKING_AGENT,
    txnSig: "5DeF6gH7jK8lM9nP1qR2sT3uV4wX5yZ6aB7cD8eF9gH1jK2lM3nP4qR5sT6uV7wX8yZ9aB1cD2eF3gH",
    slot: 285_004_500,
    blockTime: "2026-04-21T14:20:00Z",
    targetProgram: MARINADE,
    amountLamports: 6_500_000_000,
    status: "executed",
    rejectReason: null,
    rawEvent: {},
    createdAt: "2026-04-21T14:20:01Z",
  },

  // === Alpha Scanner — normal, then burst, then paused ===
  {
    id: "c3d4e5f6-0001-4000-8000-000000000001",
    policyPubkey: ALPHA_SCANNER,
    txnSig: "6EfG7hJ8kL9mN1pQ2rS3tU4wV5xA6bC7dE8fG9hJ1kL2mN3pQ4rS5tU6wV7xA8bC9dE1fG2hJ3kL4mN",
    slot: 285_000_300,
    blockTime: "2026-04-21T09:10:00Z",
    targetProgram: JUPITER,
    amountLamports: 500_000_000,
    status: "executed",
    rejectReason: null,
    rawEvent: {},
    createdAt: "2026-04-21T09:10:01Z",
  },
  {
    id: "c3d4e5f6-0001-4000-8000-000000000002",
    policyPubkey: ALPHA_SCANNER,
    txnSig: "7FgH8jK9lM1nP2qR3sT4uV5wX6yZ7aB8cD9eF1gH2jK3lM4nP5qR6sT7uV8wX9yZ1aB2cD3eF4gH5jK",
    slot: 285_002_500,
    blockTime: "2026-04-21T12:00:00Z",
    targetProgram: JUPITER,
    amountLamports: 800_000_000,
    status: "executed",
    rejectReason: null,
    rawEvent: {},
    createdAt: "2026-04-21T12:00:01Z",
  },
  {
    id: "c3d4e5f6-0001-4000-8000-000000000003",
    policyPubkey: ALPHA_SCANNER,
    txnSig: "8GhJ9kL1mN2pQ3rS4tU5wV6xA7bC8dE9fG1hJ2kL3mN4pQ5rS6tU7wV8xA9bC1dE2fG3hJ4kL5mN6pQ",
    slot: 285_004_900,
    blockTime: "2026-04-21T14:55:00Z",
    targetProgram: SYSTEM,
    amountLamports: 400_000_000,
    status: "executed",
    rejectReason: null,
    rawEvent: {},
    createdAt: "2026-04-21T14:55:01Z",
  },
  // --- Burst begins: 5 txns in 10 seconds ---
  {
    id: "c3d4e5f6-0001-4000-8000-000000000004",
    policyPubkey: ALPHA_SCANNER,
    txnSig: "9HjK1lM2nP3qR4sT5uV6wX7yZ8aB9cD1eF2gH3jK4lM5nP6qR7sT8uV9wX1yZ2aB3cD4eF5gH6jK7lM",
    slot: 285_005_100,
    blockTime: "2026-04-21T15:00:00Z",
    targetProgram: UNKNOWN_PROGRAM, // not whitelisted!
    amountLamports: 1_800_000_000,  // 90% of cap
    status: "executed",
    rejectReason: null,
    rawEvent: {},
    createdAt: "2026-04-21T15:00:01Z",
  },
  {
    id: "c3d4e5f6-0001-4000-8000-000000000005",
    policyPubkey: ALPHA_SCANNER,
    txnSig: "1JkL2mN3pQ4rS5tU6wV7xA8bC9dE1fG2hJ3kL4mN5pQ6rS7tU8wV9xA1bC2dE3fG4hJ5kL6mN7pQ8rS",
    slot: 285_005_102,
    blockTime: "2026-04-21T15:00:02Z",
    targetProgram: UNKNOWN_PROGRAM,
    amountLamports: 1_900_000_000,  // 95% of cap
    status: "executed",
    rejectReason: null,
    rawEvent: {},
    createdAt: "2026-04-21T15:00:03Z",
  },
  {
    id: "c3d4e5f6-0001-4000-8000-000000000006",
    policyPubkey: ALPHA_SCANNER,
    txnSig: "2KlM3nP4qR5sT6uV7wX8yZ9aB1cD2eF3gH4jK5lM6nP7qR8sT9uV1wX2yZ3aB4cD5eF6gH7jK8lM9nP",
    slot: 285_005_104,
    blockTime: "2026-04-21T15:00:05Z",
    targetProgram: UNKNOWN_PROGRAM,
    amountLamports: 1_950_000_000,
    status: "executed",
    rejectReason: null,
    rawEvent: {},
    createdAt: "2026-04-21T15:00:06Z",
  },
  {
    id: "c3d4e5f6-0001-4000-8000-000000000007",
    policyPubkey: ALPHA_SCANNER,
    txnSig: "3LmN4pQ5rS6tU7wV8xA9bC1dE2fG3hJ4kL5mN6pQ7rS8tU9wV1xA2bC3dE4fG5hJ6kL7mN8pQ9rS1tU",
    slot: 285_005_106,
    blockTime: "2026-04-21T15:00:08Z",
    targetProgram: UNKNOWN_PROGRAM,
    amountLamports: 2_000_000_000,  // at cap
    status: "rejected",
    rejectReason: "Agent paused by monitor",
    rawEvent: {},
    createdAt: "2026-04-21T15:00:09Z",
  },
];
