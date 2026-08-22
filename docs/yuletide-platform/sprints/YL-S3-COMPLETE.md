# YL-S3 Complete — RBAC / Permissions Centralization

**STATUS:** COMPLETE  
**VERDICT:** PASS  
**Date:** 2026-08-10  

## Scope completed

- Central `PERMISSION_REGISTRY` + `can` / capability helpers on `@clcrm/types`
- `adminProcedure` / `officeProcedure` use `hasAdminCapability` / `hasOfficeCapability` (no legacy role arrays)
- Server helpers `authCan` / `assertAuthCan`; UI helpers `userCan` / `userIsAdmin` / `userIsOffice`
- Unit coverage for registry/capabilities; permissions + auth integration still green
- Domain doc `YL-S3-rbac.md`

## Reused

- Existing `SYSTEM_ROLES` / `PermissionMatrix` / `hasPermission`
- Existing `permissionProcedure` / `requirePermission` for fine-grained deletes
- Prior office vs crew mapping intent (field roles stay off desk CRM)

## Hardened

- Admin gate = settings.edit (not hardcoded owner|admin strings)
- Office gate = any resource view, excluding `read_only` + field-only settings roles
- Prefer namespaced `resource.action` keys over `role ===` in new code

## New

- `packages/types/src/permissions.ts` (+ `permissions.test.ts`)
- `packages/api/src/permissions.ts` (`authCan` / `assertAuthCan`)
- `apps/web/src/lib/permissions.ts`
- `docs/yuletide-platform/YL-S3-rbac.md`

## Firestore / Rules / Functions / Storage / Auth providers

NONE (app/API authorization only). Rules still use legacy roles until YL-S4.

## Verification

| Check | Result |
|-------|--------|
| Unit `npm test` | **PASS** 241/241 |
| Permissions + auth integration (emulator) | **PASS** 20/20 |
| Production deploy | **NONE** |

## Repair passes used

0 / 2

## Deferred

- Full router cutover from broad `officeProcedure` to resource-scoped `permissionProcedure` → **YL-BACKLOG-012**
- Firestore rules RBAC rewrite → YL-S4
- Dual role consolidation remainder → **YL-BACKLOG-007**

## Next sprint

**NOT AUTHORIZED.**
