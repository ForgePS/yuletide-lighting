# Portal Phase 2 S6 — Security evidence

**ENVIRONMENT:** EMULATOR  
**S5 checkpoint SHA:** `d9d8242ad6df0f9e6f58af27baa96bcf16135a3d`  
**Production writes:** 0  
**Deployment:** NO

## Controls delivered

| Control                              | Implementation                                                            | Evidence                                      |
| ------------------------------------ | ------------------------------------------------------------------------- | --------------------------------------------- |
| Central mutation guard               | `portal-mutation.ts` — transitions, idempotency, payable cents, safe mode | Unit + integration + `audit:portal-mutations` |
| Fail-closed transitions              | `canPortalTransition` — unknown → DENY                                    | Integration transition matrix                 |
| Idempotency scope binding            | `org\|customer\|account\|user\|action\|resourceId`                        | Integration cross-customer + action binding   |
| Server-authoritative invoice amounts | `portalInvoicePayableCents` + checkout route                              | Unit matrix + integration payment authority   |
| Checkout safe mode                   | `portalPaymentSafeMode` — REAL PAYMENT TRANSACTIONS: **0**                | Integration safe mode + checkout static audit |
| Agreement signing transaction        | `runTransaction` — no double active                                       | Integration parallel sign + static audit      |
| Rebook terminal replay               | No duplicate proposals on terminal status                                 | Integration rebook + idempotency              |
| Mockup visibility deny               | `draft`, `staff_only` rejected                                            | Integration draft/staff-only deny             |
| QR single-use terminal               | `used_for_activation` in `isInactiveStatus`                               | Unit QR test + static audit                   |
| Cross-customer ownership             | `requirePortalOwnedRecord` on mutations                                   | Integration invoice/property denial           |
| Cross-tenant isolation               | Org-scoped resource lookup                                                | Integration cross-tenant denial               |
| Message rate limit                   | Max 30 / 15 min inside idempotency execute                                | Integration rate limit suite                  |
| Stale-page enforcement               | Role downgrade, feature disable, suspension deny                          | Integration stale-page suite                  |
| Timeline secret exclusion            | No Stripe/OTP/session secrets in customer timeline                        | Integration audit timeline blob check         |

## Static gates

| Audit                      | Purpose                                                           | Status             |
| -------------------------- | ----------------------------------------------------------------- | ------------------ |
| `audit:portal-mutations`   | Guard module, checkout, transitions, QR terminal, rebook terminal | Pending final gate |
| `audit:portal-idempotency` | Idempotency wiring + replay patterns                              | Pending final gate |
| portal-permissions         | Role matrix                                                       | Prior PASS (S1)    |
| portal-sessions            | Session semantics                                                 | Prior PASS (S2)    |
| portal-auth-security       | Auth hardening                                                    | Prior PASS (S3)    |
| portal-query-scope         | Query scoping                                                     | Prior PASS (S4)    |
| portal-public-dtos         | DTO safety                                                        | Prior PASS (S4)    |
| portal-routes              | Route authorization                                               | Prior PASS (S5)    |
| portal-files               | File ticket security                                              | Prior PASS (S5)    |

## Test evidence summary

| Layer       | File                                   | Approx. scope                                      |
| ----------- | -------------------------------------- | -------------------------------------------------- |
| Unit        | `portal-phase2-s6-security.test.ts`    | Transitions, payable, safe mode                    |
| Unit        | `portal-qr360.test.ts`                 | QR inactive status including `used_for_activation` |
| Integration | `portal-phase2-s6.integration.test.ts` | ≥100 assertions across 20+ describe blocks         |
| Rules       | Existing portal rules suite            | Unchanged scope in S6                              |

## Residual risks (accepted / deferred)

- Session mint storm (`establishSession`) — low impact; audit hardening deferred
- Upload orphan files on abandoned form — medium; idempotency on upload deferred
- P0.2C staging-auth E2E skips — non-portal; 13 skips documented
- Live Stripe path — blocked by safe mode until explicit production cutover

## Production contact assertion

| Channel                     | S6 automated evidence |
| --------------------------- | --------------------- |
| Stripe live charges         | **0**                 |
| Production email            | **0**                 |
| Production SMS              | **0**                 |
| Firestore production writes | **0**                 |
