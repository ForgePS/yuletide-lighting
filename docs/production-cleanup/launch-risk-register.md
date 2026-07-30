# Launch Risk Register (Phase 0)

**Date:** 2026-07-30  
**Severity:** Blocker = must be zero before “production ready” per directive §25–26.

| ID | Risk | Severity | Evidence | Phase to address |
|----|------|----------|----------|------------------|
| R01 | Fail-open `requireModule` | **Blocker** | `packages/api/src/trpc.ts` | Phase 3 |
| R02 | Sparse permission/module enforcement on APIs | **Blocker** | Only ~8 `permissionProcedure`, 2 module areas | Phase 3 |
| R03 | Dual role systems; `read_only` → `crew` | **Blocker** | `apps/web/src/lib/auth.ts` | Phase 3 |
| R04 | Dual Firestore paths (properties/jobs/messages) | **Blocker** | `record-paths.ts`, customer360 dual-write | Phase 1 |
| R05 | Dual mounted legacy + `*360` routers | **High** | `firestore.ts` appRouter | Phase 1 |
| R06 | Mocked weather/AI presented as features | **Blocker** | schedule/mockups packages | Phase 8 |
| R07 | Stub integrations look configurable | **Blocker** | `DEFAULT_INTEGRATIONS` | Phase 8 |
| R08 | Broken nav link `/app/field` | **High** | field/signs/report page | Phase 4 |
| R09 | Placeholder field report route | **Medium** | `/app/field/signs/report` | Phase 4 |
| R10 | Sign Tracker missing `moduleKey` on nav | **High** | `crm-ui-config.ts` | Phase 4 |
| R11 | No Firestore rules emulator test suite | **Blocker** | Missing tests | Phase 10 / 17 |
| R12 | CI does not run unit/tenant-isolation tests | **High** | `.github/workflows/ci.yml` | Phase 17 / 18 |
| R13 | Lint failing on web | **High** | `data-import.tsx` Link rule | Immediate / Phase 0 follow-up |
| R14 | Mapbox token often empty | **High** | `.env` / maps blank | Ops / Phase 8 |
| R15 | Creator trust via env email/UID only | **High** | `.env.example`, creator360 | Phase 9 / 3 |
| R16 | Empty creator allow-list opens all users locally | **Medium** (prod must set) | `.env.example` tip | Phase 9 |
| R17 | Backups / restore drills incomplete | **Blocker** | staging-and-backup docs | Phase 15 |
| R18 | No production error monitoring (Sentry) | **Blocker** | checklist | Phase 15 |
| R19 | Stripe webhook lifecycle not fully proven | **Blocker** | checklist | Phase 11 |
| R20 | Global search not implemented | **High** (UX + directive) | inventory | Phase 4 |
| R21 | Task center not implemented | **High** | no `/app/tasks` | Phase 6 |
| R22 | Staff notification delivery incomplete | **High** | settings config vs delivery | Phase 6 |
| R23 | Hardcoded business values present | **High** | hardcoded-value-report.md | Phase 2 / 24 |
| R24 | Unbounded list queries / client filtering | **High** | many list UIs | Phase 16 |
| R25 | Portal token hardening gaps (rate limit, uniform errors) | **Blocker** (security) | portal QR/OTP | Phase 9 |
| R26 | Staging environment incomplete | **High** | `.env.staging.example`, docs | Phase 18 |
| R27 | Legacy Postgres package still in workspace | **Medium** | `@clcrm/db`, dead router | Phase 1 |
| R28 | Web lint errors block clean CI locally | **High** | turbo lint FAIL | Fix early |

## Baseline command status implications

`npm run production:check` is designed to **exit nonzero** while R01–R07-class mock/placeholder findings, missing rules tests, and dead routes remain. Treat a failing production:check as expected until remediation phases land — not as a signal that Phase 0 failed to establish the gate.

## Risk trend notes

Improvements already present vs older Phase 0 migration map:

- HttpOnly session cookie path exists
- `requireAppSession` on app/creator layouts
- Tenant isolation unit tests exist (7 cases) — necessary but not sufficient
- Active API does not import `getDb()`

Residual launch blockers remain dominated by **authorization fail-open**, **dual data/API paths**, **mocked features**, and **ops (backup/monitor/staging)**.
