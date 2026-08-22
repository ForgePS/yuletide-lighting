# Portal Phase 2 S6 — Rollback

**ENVIRONMENT:** EMULATOR — no deployment performed.

## Code rollback

Revert S6 commits (or working-tree changes) touching:

| Area                   | Paths                                                                        |
| ---------------------- | ---------------------------------------------------------------------------- |
| Mutation guard         | `packages/firebase/src/portal-mutation.ts`                                   |
| Public-token hardening | `packages/firebase/src/proposals.ts`, `agreements.ts`, `mockups360.ts`       |
| Portal creates         | `packages/firebase/src/portal360.ts`                                         |
| Rebook terminal        | `packages/firebase/src/rebooking360.ts`                                      |
| QR terminal            | `packages/firebase/src/portal-qr360.ts`, `portal-qr360.test.ts`              |
| Checkout               | `apps/web/src/app/api/stripe/checkout/route.ts`                              |
| Static audits          | `scripts/audit-portal-mutations.mjs`, `scripts/audit-portal-idempotency.mjs` |
| Rules runner           | `scripts/run-firebase-rules-tests.mjs` (if modified for S6 gate stability)   |
| Tests                  | `portal-phase2-s6-security.test.ts`, `portal-phase2-s6.integration.test.ts`  |
| Docs                   | `docs/production-cleanup/portal-phase-2-s6-*`                                |

**Preserve S5 checkpoint:** `d9d8242ad6df0f9e6f58af27baa96bcf16135a3d` — rollback to this SHA restores pre-S6 state.

## Data rollback

- Emulator-only seeds; no production Firestore writes.
- Idempotency docs under `organizations/{orgId}/portalIdempotencyKeys/` — safe to delete in emulator.
- No schema migrations in S6.

## Forward fix (preferred over rollback)

| Issue                             | Mitigation                                                         |
| --------------------------------- | ------------------------------------------------------------------ |
| Checkout safe mode misconfigured  | Set `PORTAL_PAYMENT_SAFE_MODE=1`; verify `portalPaymentSafeMode()` |
| Idempotency conflicts in dev      | Clear `portalIdempotencyKeys` collection for test org              |
| QR stuck in `used_for_activation` | Expected for single-use QRs; issue new QR for re-activation        |
| Rate limit in dev                 | `clearPortalRateLimitBuckets()` or wait 15 minutes                 |

## Production impact

**None.** S6 changes are uncommitted / emulator-evidence only until explicit production cutover authorization.
