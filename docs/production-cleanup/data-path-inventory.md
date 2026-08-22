# Data Path Inventory (Phase 0)

**Date:** 2026-07-30  
**Sources:** `packages/firebase/src/record-paths.ts`, `docs/phase0-migration-map.md`, live firebase modules.

## Canonical rule

Firestore remains the only production product SoT. Postgres/Drizzle is legacy and unused by the active API export.

## Entity path matrix

| Entity | Canonical path | Legacy / dual path | Write policy today |
|--------|----------------|--------------------|--------------------|
| Properties | `organizations/{org}/properties` + `customerId` | `customers/{id}/properties` | New writes via org helpers; dual-write/read compat remains |
| Jobs | `organizations/{org}/jobs` | `customers/{id}/jobs` | Same pattern |
| Messages | `organizations/{org}/conversations` (+ messages) | `messageThreads` / legacy `messages` | Legacy migrated on list |
| Proposals | Org `proposals` + `publicToken` | Legacy `proposals.*` router / collectionGroup public helpers | Both mounted |
| Invoices | Org `invoices` + `publicToken` | Legacy `invoices.*` router | Both mounted |
| Users | `users/{uid}` with `organizationId` | — | Single path |
| Portal | `portalAccounts`, `portalUsers`, `portalQrCodes`, … | — | Org-scoped |
| Settings | `settings/{section}`, `roles`, `featureFlags`, … | — | Org-scoped |

## Active vs legacy API data access

| Layer | Status |
|-------|--------|
| `*360` routers | Canonical product surface |
| Non-360 routers on `appRouter` | Compatibility / partial |
| `packages/api/src/routers/index.ts` (Postgres) | Not exported; must not be reactivated |

## Standardization gaps (Phase 1)

Every entity should consistently carry: `organizationId`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, optional archive fields, revision where needed. Audit and backfill are **not** completed in Phase 0.

## Migration requirements (future phases — not executed now)

Idempotent scripts with dry-run, org filter, batch limits, resume cursor, conflict reporting, duplicate detection, count reconciliation, checksums, rollback metadata. **No silent overwrite.**

Phase 0 did **not** migrate or delete any production data.
