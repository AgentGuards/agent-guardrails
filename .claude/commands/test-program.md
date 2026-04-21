Build and test the Anchor program with diagnostics on failure.

Two test modes available:

**LiteSVM (fast, default for development):**
1. Run `cd program && anchor build`. If build fails, read the error output and diagnose.
2. Run `cd program && anchor test --skip-local-validator`. This runs TS tests that use LiteSVM in-process — no validator needed. Fast iteration.

**Integration (full end-to-end):**
1. Run `cd program && anchor test`. This builds, starts a local validator, deploys, runs all tests, and cleans up.

**On failure:**
- Read `program/tests/guardrails.ts` to understand what was being tested.
- Read the relevant instruction source file in `program/programs/guardrails/src/instructions/`.
- Diagnose the failure and suggest a fix.
- Report which tests passed and which failed with error details.
