# Launch Risk Register (Phase 0)

**Date:** 2026-07-30
**Severity:** Blocker = must be zero before “production ready” per directive §25–26.

| ID  | Risk                                                     | Severity                   | Evidence                                      | Phase to address              |
| --- | -------------------------------------------------------- | -------------------------- | --------------------------------------------- | ----------------------------- |
| R01 | Fail-open `requireModule`                                | **Blocker**                | `packages/api/src/trpc.ts`                    | Phase 3                       |
| R02 | Sparse permission/module enforcement on APIs             | **Blocker**                | Only ~8 `permissionProcedure`, 2 module areas | Phase 3                       |
| R03 | Dual role systems; `read_only` → `crew`                  | **Blocker**                | `apps/web/src/lib/auth.ts`                    | Phase 3                       |
| R04 | Dual Firestore paths (properties/jobs/messages)          | **Blocker**                | `record-paths.ts`, customer360 dual-write     | Phase 1                       |
| R05 | Dual mounted legacy + `*360` routers                     | **High**                   | `firestore.ts` appRouter                      | Phase 1                       |
| R06 | Mocked weather/AI presented as features                  | **Blocker**                | schedule/mockups packages                     | Phase 8                       |
| R07 | Stub integrations look configurable                      | **Blocker**                | `DEFAULT_INTEGRATIONS`                        | Phase 8                       |
| R08 | Broken nav link `/app/field`                             | **High**                   | field/signs/report page                       | Phase 4                       |
| R09 | Placeholder field report route                           | **Medium**                 | `/app/field/signs/report`                     | Phase 4                       |
| R10 | Sign Tracker missing `moduleKey` on nav                  | **High**                   | `crm-ui-config.ts`                            | Phase 4                       |
| R11 | No Firestore rules emulator test suite                   | **Blocker**                | Missing tests                                 | Phase 10 / 17                 |
| R12 | CI does not run unit/tenant-isolation tests              | **High**                   | `.github/workflows/ci.yml`                    | Phase 17 / 18                 |
| R13 | Lint failing on web                                      | **High**                   | `data-import.tsx` Link rule                   | Immediate / Phase 0 follow-up |
| R14 | Mapbox token often empty                                 | **High**                   | `.env` / maps blank                           | Ops / Phase 8                 |
| R15 | Creator trust via env email/UID only                     | **High**                   | `.env.example`, creator360                    | Phase 9 / 3                   |
| R16 | Empty creator allow-list opens all users locally         | **Medium** (prod must set) | `.env.example` tip                            | Phase 9                       |
| R17 | Backups / restore drills incomplete                      | **Blocker**                | staging-and-backup docs                       | Phase 15                      |
| R18 | No production error monitoring (Sentry)                  | **Blocker**                | checklist                                     | Phase 15                      |
| R19 | Stripe webhook lifecycle not fully proven                | **Blocker**                | checklist                                     | Phase 11                      |
| R20 | Global search not implemented                            | **High** (UX + directive)  | inventory                                     | Phase 4                       |
| R21 | Task center not implemented                              | **High**                   | no `/app/tasks`                               | Phase 6                       |
| R22 | Staff notification delivery incomplete                   | **High**                   | settings config vs delivery                   | Phase 6                       |
| R23 | Hardcoded business values present                        | **High**                   | hardcoded-value-report.md                     | Phase 2 / 24                  |
| R24 | Unbounded list queries / client filtering                | **High**                   | many list UIs                                 | Phase 16                      |
| R25 | Portal token hardening gaps (rate limit, uniform errors) | **Blocker** (security)     | portal QR/OTP                                 | Phase 9                       |
| R26 | Staging environment incomplete                           | **High**                   | `.env.staging.example`, docs                  | Phase 18                      |
| R27 | Legacy Postgres package still in workspace               | **Medium**                 | `@clcrm/db`, dead router                      | Phase 1                       |
| R28 | Web lint errors block clean CI locally                   | **High**                   | turbo lint FAIL                               | Fix early                     |

## Baseline command status implications

`npm run production:check` is designed to **exit nonzero** while R01–R07-class mock/placeholder findings, missing rules tests, and dead routes remain. Treat a failing production:check as expected until remediation phases land — not as a signal that Phase 0 failed to establish the gate.

## Risk trend notes

Improvements already present vs older Phase 0 migration map:

- HttpOnly session cookie path exists
- `requireAppSession` on app/creator layouts
- Tenant isolation unit tests exist (7 cases) — necessary but not sufficient
- Active API does not import `getDb()`

Residual launch blockers remain dominated by **authorization fail-open**, **dual data/API paths**, **mocked features**, and **ops (backup/monitor/staging)**.

## Customer Portal Phase 2

**ENVIRONMENT=EMULATOR**

- **P1:** Public portal procedures remain magic-token-first; dedicated-session and canonical role/action enforcement is incomplete.
- **P1:** Production invitation delivery, complete portal/QR rules evidence, and Playwright identity/isolation evidence remain open.
- **P2:** WCAG 2.2 AA and phase-brief responsive validation remain incomplete.
- Legacy `customers.portalToken` dual-write is an accepted compatibility risk until the documented removal criteria are met.

See `portal-phase-2-defect-register.md`. **NO DEPLOYMENT or production write is authorized.**

### P2-S3 invitation and OTP update

**ENVIRONMENT=EMULATOR; STATUS=IN_PROGRESS.**

- Hashed invitation/OTP storage, transactional claim, replacement invalidation, purpose binding, generic messages, and emulator-only delivery reduce R25.
- Static auth-security, portal-permission, and portal-session audits are launch gates.
- R25 is not closed: legacy plaintext magic tokens and a production-grade distributed limiter remain deferred; live delivery and S3 execution evidence remain pending.

### P2-S4 query and DTO update

**ENVIRONMENT=EMULATOR; STATUS=IN_PROGRESS.**

- Customer-owned portal reads are datastore-scoped; organization-wide fallback reads are a static-gate blocker.
- Public DTOs are explicit allowlists and are tested with poisoned sensitive fields.
- Cross-customer, cross-tenant, job-ID, and payment/signing-token isolation command evidence remains pending.
- No production query, migration, write, or deployment was performed.

### P2-S5 route and file access update

**ENVIRONMENT=EMULATOR; STATUS=IN_PROGRESS.**

- Canonical route authorization and short-lived file tickets reduce exposure from permanent Storage URLs and unmapped deep links.
- Direct client Storage for portal customers remains denied; staff org reads unchanged.
- S5 gate evidence and static route/file audits pending; magic-token hardening plan unchanged.

### Portal P2-S6 (2026-08-02)

| Risk                                  | Mitigation                                      | Status                        |
| ------------------------------------- | ----------------------------------------------- | ----------------------------- |
| Duplicate portal creates / double pay | withPortalIdempotency, payable cents, safe mode | Mitigated (emulator evidence) |
| Invalid customer state transitions    | canPortalTransition + public-token guards       | Mitigated                     |

### Portal P2-S7 (2026-08-02)

| Risk                                        | Mitigation                                                           | Status                                                               |
| ------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Legacy plaintext magic tokens at rest (R25) | Hash-only new writes; `resolvePortalMagicAccess`; session-first URLs | **In progress** — emulator only; production migration NOT authorized |
| Token in URL / referrer leakage             | `no-referrer`, `no-store`, `noindex` on legacy entry paths           | Implemented in S7 worktree; gate pending                             |
| Stale plaintext after revoke/rotate         | Lifecycle checks before legacy lookup                                | Integration evidence pending gate run                                |
