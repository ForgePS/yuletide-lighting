# YL-S5 Complete — Resource-scoped `permissionProcedure` cutover

**STATUS:** COMPLETE  
**VERDICT:** PASS  
**Date:** 2026-08-10  

## Scope completed

- Closed **YL-BACKLOG-012**: CRM routers no longer use `officeProcedure` / `adminProcedure`
- Expanded `office_staff` SYSTEM_ROLES desk bundle (+ `settings.view` only) so cutover does not lock out office users from proposals/mockups/reports/inventory
- Domain map documented in `YL-S5-router-permissions.md`

## Reused

- YL-S3 `permissionProcedure` / `requirePermission` / `assertAuthCan`
- Existing `PermissionResource` set (no new matrix resources)
- Sign-tracker permissions integration suite

## Hardened

- Procedure gates require specific `resource.action` bits
- Intentional tightening: roles that only had coarse desk capability lose domains they lack in the matrix

## New / changed

- `packages/types/src/settings.ts` (`office_staff` matrix)
- `packages/types/src/permissions.test.ts`
- All `packages/api/src/routers/*` staff procedures → `permissionProcedure` (or `assertAuthCan` in `import360`)
- Legacy Drizzle `routers/index.ts` migrated for consistency
- Docs: `YL-S5-PLAN.md`, `YL-S5-COMPLETE.md`, `YL-S5-router-permissions.md`

## Firestore / Rules / Functions / Storage / Auth providers

NONE this sprint (API authorization only). No production deploy.

## Verification

| Check | Result |
|-------|--------|
| Unit `npm test` | **PASS** 242/242 |
| Permissions + auth integration | **PASS** 20/20 |
| Full `test:integration` (incl. portal batches) | **PASS** |
| Production deploy | **NONE** |

## Repair passes used

0 / 2

## Deferred

- Dual role/path + Firestore rules matrix rewrite → **YL-BACKLOG-007**
- Storage org lifecycle mirror (from YL-S4 note)
- UI nav permission polish
- Orgs with customized Firestore role matrices may need ops review after cutover

## Next sprint

**NOT AUTHORIZED.**
