# Portal Phase 2 S6 baseline

**Checkpoint:** PORTAL-P2-S6 (transaction integrity) — **IN_PROGRESS**  
**ENVIRONMENT:** EMULATOR  
**Branch:** `production/yuletide-cleanup-launch-readiness`  
**S5 base SHA:** `c0cae35a23f96cf3dc08c6f98842c04777775853`  
**S5 checkpoint SHA:** `d9d8242ad6df0f9e6f58af27baa96bcf16135a3d`  
**HEAD (pre-S6 commit):** `d9d8242` — S6 implementation in working tree until S6 commit  
**Production/deploy actions:** none permitted or performed

## S5 checkpoint preserved

S5 closeout commit `d9d8242` is the last committed portal phase checkpoint. S6 hardening builds on that tree without reverting S1–S5 evidence.

Committed at S5 checkpoint: Portal Phase 2 S1–S5 implementation, audits, tests, docs, and emulator evidence (127 files).

## S6 scope (working tree)

| Area                   | Primary modules                                                                                                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mutation guard         | `packages/firebase/src/portal-mutation.ts` — `canPortalTransition`, `requirePortalMutation`, `withPortalIdempotency`, `portalInvoicePayableCents`, `portalPaymentSafeMode` |
| Public-token hardening | `proposals.ts`, `agreements.ts`, `mockups360.ts` — state replay + transition guards                                                                                        |
| Portal creates         | `portal360.ts` — idempotency on service, schedule, message, rebook                                                                                                         |
| Rebook terminal        | `rebooking360.ts` — `processRebookRecord` short-circuits `rebooked` / `upgrade_requested` / `declined`                                                                     |
| QR terminal            | `portal-qr360.ts` — `used_for_activation` in `isInactiveStatus`                                                                                                            |
| Checkout authority     | `apps/web/src/app/api/stripe/checkout/route.ts` — server amount, safe mode, ignores client `amountCents`                                                                   |
| Static audits          | `scripts/audit-portal-mutations.mjs`, `scripts/audit-portal-idempotency.mjs`                                                                                               |
| Tests                  | `portal-phase2-s6-security.test.ts`, `portal-phase2-s6.integration.test.ts`                                                                                                |

## S5 test results summary (baseline for S6 gates)

| Gate                       | Result                                                                      |
| -------------------------- | --------------------------------------------------------------------------- |
| Format                     | PASS (S5)                                                                   |
| Lint                       | PASS (pre-existing jsx-a11y warnings)                                       |
| Typecheck                  | PASS (S5)                                                                   |
| Unit                       | PASS — 195 (S5)                                                             |
| Integration                | PASS — 428 (portal S5: 54; prior portal S1–S4: 303)                         |
| Firebase rules             | PASS — 18                                                                   |
| E2E                        | PASS — 48 passed, **13 skipped** (portal specs 39/39), ENVIRONMENT=EMULATOR |
| Responsive / Accessibility | Covered in portal Playwright viewport + heading checks                      |
| Build                      | PASS                                                                        |
| production:check 1–3       | PASS (S5)                                                                   |

Static portal audits at S5 closeout: permissions, sessions, auth-security, query-scope, public-dtos, routes, files — all PASS.

S6 adds: `audit:portal-mutations`, `audit:portal-idempotency`.

## Deferred items (unchanged)

- Legacy magic-token hash migration
- Token URL final cutover
- Real nonproduction Firebase validation
- Firebase rules/index deploy
- Production deployment

## Known E2E skips (13)

Thirteen E2E tests were skipped in the S5 emulator run (48 passed). Full classification: `portal-phase-2-s6-skipped-test-review.md`.

| Classification           | Count |
| ------------------------ | ----: |
| NON_PORTAL_NOT_S6        |    10 |
| LEGITIMATE_PLATFORM_SKIP |     3 |
| PORTAL_REQUIRED_FIX_NOW  |     0 |

All 13 are P0.2C Sign Tracker / staging-auth gated. **Portal launch-critical skipped = 0.**

## S6 gate status

See `portal-phase-2-s6-gate-reconciliation.md` and `portal-phase-2-s6-completion.md` (STATUS: IN_PROGRESS).
