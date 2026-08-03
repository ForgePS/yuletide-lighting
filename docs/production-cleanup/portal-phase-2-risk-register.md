# Customer Portal Phase 2 — Risk Register

**ENVIRONMENT:** EMULATOR
**Status:** OPEN; no deployment authorization

| ID     | Risk                                                 | Severity                    | S3 treatment / owner                                             |
| ------ | ---------------------------------------------------- | --------------------------- | ---------------------------------------------------------------- |
| P2-R01 | Legacy magic tokens remain plaintext                 | P1 security                 | S7A: new writes hash-only; legacy dual-read; prod migration open |
| P2-R02 | S3 rate limiter is process-local                     | P1 security/availability    | Replace with distributed atomic limiter before production        |
| P2-R03 | Live invitation/OTP delivery unverified              | P1 operational              | S3 provider refuses production; later delivery review            |
| P2-R04 | Claim/OTP browser and accessibility evidence pending | P1 quality                  | Execute S3 test plan on emulator                                 |
| P2-R05 | Invitation token/OTP leakage through future code     | P0 security regression      | Static auth-security audit in `production:check`                 |
| P2-R06 | Client supplies tenant/customer/role during claim    | P0 authorization regression | Schema static audit and server-derived identity                  |
| P2-R07 | Portal query broadens to organization scan           | P0 tenant isolation         | S4 query-scope static gate + emulator isolation suite            |
| P2-R08 | Public DTO exposes internal financial/auth fields    | P0 data exposure            | S4 DTO static gate + poisoned-record assertions                  |

## P2-S3 update

S3 reduces invitation replay, plaintext invitation/OTP storage, enumeration, resend, and brute-force risk. It does not close legacy magic-token, production delivery, distributed rate-limit, or pending execution-evidence risks. S1 permission and S2 session controls must not be disabled during mitigation or rollback.

## P2-S4 update

S4 controls R07/R08 through fail-closed customer queries, explicit ownership checks, public allowlist serializers, static gates, and 142 emulator test cases. Both risks remain open until command evidence is recorded; any finding is a deployment blocker.

## P2-S5 update

S5 adds route authorization (`requirePortalRouteAccess`) and short-lived file tickets (15 min TTL) so disabled features and cross-customer file paths fail closed without exposing Storage URLs. Nav hiding remains UX-only; deep links and API must deny. Static route/file audits PASS (2026-08-01 EMULATOR gate); production:check 3� PASS. Playwright E2E deferred (no local server). Magic-token migration unchanged.

## P2-S6 update (2026-08-02)

- Mutation/idempotency guard landed in @yuletide/firebase (portal-mutation.ts); residual BLOCKERs from mutation map closed for portal creates and public-token replay paths.
- Payment: server payable cents + checkout safe mode; live Stripe blocked under EMULATOR.
- Evidence: portal-phase-2-s6-security-evidence.md, integration portal-phase2-s6.integration.test.ts.

## P2-S7A update (2026-08-02)

- P2-R01: Hash-only new writes + dual-read resolver + session decoupling in emulator; production plaintext inventory still open.
- Checkpoint report: `portal-phase-2-s7a-completion.md`. Full S7 / S7B not complete.
- Do not close R01 until authorized production migration evidence.
