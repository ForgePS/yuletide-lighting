# Portal Phase 2 S6 — Gate Reconciliation

**ENVIRONMENT:** EMULATOR  
**Branch:** `production/yuletide-cleanup-launch-readiness`  
**S5 checkpoint:** `d9d8242`  
**Status:** COMPLETE (pre-commit gate green; SHA recorded at commit)

## Failure inventory

| Command                                             | Failure                                                               | Root cause                                                                                             | S6 regression        | Pre-existing               | Correction                                                                                                                             | Retest                 | Final          |
| --------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | -------------- |
| `npm run format:changed:check`                      | Unformatted S6 docs/tests                                             | New S6 files not prettier-formatted                                                                    | YES                  | NO                         | Prettier write on S6-touched paths only                                                                                                | `format:changed:check` | PASS           |
| `npm test`                                          | QR `used_for_activation` expected inactive=false                      | S6 made single-use QR terminal                                                                         | NO (security intent) | NO                         | Update test to expect `true`                                                                                                           | `npm test` (203)       | PASS           |
| `npm run typecheck` vs `production:check` typecheck | Gate typecheck failed while standalone sometimes passed               | Web resolves `@yuletide/firebase` via `local_deps`; unsynced deps + `agreements.ts` `tx.update` typing | YES                  | Partial (local_deps drift) | Sync `prepare-firebase-deps` before typecheck in production-check; cast transaction patch                                              | both typechecks        | PASS           |
| `npm run test:firebase-rules` (first)               | Port 8080/4400 EADDRINUSE / hub race                                  | Orphan emulator / insufficient settle between serial suites                                            | NO (infra)           | YES (flake)                | `scripts/run-firebase-rules-tests.mjs` port wait + settle; clear orphans; rules ×3                                                     | rules ×3               | PASS 18/18 ×3  |
| `npm run test:integration`                          | Mid-suite Firestore fatal exit (code 4294967295) poisoned later files | Emulator crash under cumulative portal load                                                            | NO (infra)           | YES (Windows flake)        | Batched `run-integration-tests.mjs` (fresh emulator/batch), JAVA `-Xmx2g`, one infra retry; ignore shutdown noise after vitest success | full integration       | PASS           |
| `npm run production:check`                          | Cascaded format + typecheck + unit                                    | Same as rows above                                                                                     | YES                  | NO                         | Fix upstream causes                                                                                                                    | production:check ×3    | PASS/PASS/PASS |

## Notes

- `used_for_activation` terminal behavior is intentional S6 security.
- Message rate limit: max **30 / 15 minutes**, consumed only inside idempotency `execute` (retries do not consume quota). Configurable via call-site opts; defaults from `portal-rate-limit` / security config for OTP buckets elsewhere.
- Idempotency keys are **scope-bound** (`org|customer|account|user|action|resourceId`) — cross-customer reuse does not replay another customer’s result.
- P0.2C staging-auth E2E skips remain NON_PORTAL.
- S6 checkout/public-token E2E cases that require undeployed S6 code skip on the production host and run under `playwright.portal-emulator.config.ts`.
