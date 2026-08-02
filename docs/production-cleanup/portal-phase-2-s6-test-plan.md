# Portal Phase 2 S6 — Test plan

**ENVIRONMENT:** EMULATOR  
**S5 checkpoint SHA:** `d9d8242ad6df0f9e6f58af27baa96bcf16135a3d`

## Unit

**File:** `packages/firebase/src/portal-phase2-s6-security.test.ts`

| Suite             | Coverage                                        |
| ----------------- | ----------------------------------------------- |
| State transitions | Proposal, agreement, mockup valid/invalid paths |
| Payable cents     | Deposit logic, closed statuses, clamping        |
| Safe mode         | `portalPaymentSafeMode()` under emulator env    |
| Denial typing     | `PortalMutationDeniedError` reason codes        |

**File:** `packages/firebase/src/portal-qr360.test.ts`

| Suite              | Coverage                                        |
| ------------------ | ----------------------------------------------- |
| `isInactiveStatus` | `used_for_activation` → **true** (terminal, S6) |

## Integration (≥100 assertions)

**File:** `tests/integration/portal/portal-phase2-s6.integration.test.ts`

| Describe block                                  | Assertions                                            |
| ----------------------------------------------- | ----------------------------------------------------- |
| P2-S6 payment authority                         | Payable cents, safe mode, paid invoice deny           |
| P2-S6 proposal approval integrity               | Approve replay, terminal deny rollback                |
| P2-S6 agreement signing integrity               | Sign once, deterministic replay                       |
| P2-S6 mockup approval integrity                 | Approve replay, draft deny, staff-only deny           |
| P2-S6 portal create mutations idempotency       | Service, schedule, message keys; cross-customer scope |
| P2-S6 rebook terminal protection                | Second rebook no duplicate proposal                   |
| P2-S6 feature disable blocks mutations          | Service + messaging off                               |
| P2-S6 payable invoice matrix                    | 20+ invoice status/amount cases                       |
| P2-S6 proposal public-token flows               | Late reject deny, questions→approve, missing token    |
| P2-S6 agreement draft + replay                  | Draft sign + replay                                   |
| P2-S6 mockup revision replay                    | `revision_requested` replay                           |
| P2-S6 rebook idempotency via portal API         | Same key no duplicate comms path                      |
| P2-S6 requirePortalMutation ownership           | Cross-customer invoice deny                           |
| P2-S6 cross-customer portal mutation denial     | Foreign property deny                                 |
| P2-S6 idempotency key validation                | Short keys bypass store                               |
| P2-S6 transition matrix coverage                | Full `canPortalTransition` table (~30 cases)          |
| P2-S6 parallel concurrency                      | Proposal, mockup, agreement, service parallel races   |
| P2-S6 stale-page enforcement                    | Role downgrade, feature disable, suspension           |
| P2-S6 message rate limit                        | 30/15min bucket; idempotent retry separate            |
| P2-S6 notifications + contacts + audit timeline | Read owned; foreign deny; no secrets in timeline      |
| P2-S6 cross-tenant denial                       | Tenant A cannot mutate tenant B invoice               |
| P2-S6 payment safe mode evidence                | Server amount ignores client tampering intent         |
| P2-S6 idempotency action/resource binding       | Same key different action → separate executes         |

**Setup:** `ensureFirestoreEmulator()`, `PORTAL_PAYMENT_SAFE_MODE=1`, dual-customer + cross-tenant seeds.

## Static audits

| Audit                      | Script                                 |
| -------------------------- | -------------------------------------- |
| `audit:portal-mutations`   | `scripts/audit-portal-mutations.mjs`   |
| `audit:portal-idempotency` | `scripts/audit-portal-idempotency.mjs` |
| Prior S1–S5 portal audits  | Unchanged scope                        |

## Gates

| Gate             | Command                        | Notes                                         |
| ---------------- | ------------------------------ | --------------------------------------------- |
| Format           | `npm run format:changed:check` | Prettier on S6-touched paths                  |
| Lint             | `npm run lint`                 | Pre-existing jsx-a11y warnings acceptable     |
| Typecheck        | `npm run typecheck`            | Requires `prepare-firebase-deps` sync for web |
| Unit             | `npm test`                     | Includes QR `used_for_activation` terminal    |
| Integration      | `npm run test:integration`     | S6 suite + prior portal suites                |
| Firebase rules   | `npm run test:firebase-rules`  | `run-firebase-rules-tests.mjs` port wait      |
| Build            | `npm run build`                | —                                             |
| production:check | ×3 consecutive                 | Sync deps before typecheck                    |

## E2E

| Config                                 | Scope             | Skip expectation                          |
| -------------------------------------- | ----------------- | ----------------------------------------- |
| `playwright.portal-emulator.config.ts` | Portal specs only | **0 skips**                               |
| `playwright.config.ts` (full suite)    | 61 tests          | 13 skips (P0.2C staging-auth, non-portal) |

**Portal launch-critical skipped must be 0.** See `portal-phase-2-s6-skipped-test-review.md`.

## Not in S6 scope

- P0.2C Sign Tracker authenticated E2E (staging Auth provisioning)
- Real Stripe live-mode checkout
- Production Firebase validation
