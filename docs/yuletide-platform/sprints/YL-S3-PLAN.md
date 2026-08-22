# YL-S3 Plan — RBAC / Permissions

## Objective

Centralize the permission registry and authorization helpers. Replace `adminProcedure` / `officeProcedure` legacy `role ===` gates with capability helpers derived from the settings permission matrix (+ field-role exclusions). Avoid a full router rewrite this sprint.

## Authorization

User: `authorized to start YL-S3`. Focus: centralize helpers + reduce role=== in API.

## Current State

- `@clcrm/types`: `PermissionResource` / `PermissionAction` / `PermissionMatrix` / `SYSTEM_ROLES` / `hasPermission`
- `@clcrm/api`: `permissionProcedure`, `requirePermission`; **`adminProcedure` / `officeProcedure` still check legacy `UserRole` arrays**
- Dual model: legacy 4 roles (rules + AuthContext.role) vs 11 settings roles (BACKLOG-007)
- Sparse use of `permissionProcedure` in routers; most CRM routes use `officeProcedure`

## Reuse

- SYSTEM_ROLES matrix + hasPermission
- getUserPermissions / settings360 roles APIs
- permissionProcedure for fine-grained deletes already wired

## Changes Required

1. `packages/types/src/permissions.ts` — namespaced registry + `can` / capability helpers
2. Rewrite `adminProcedure` / `officeProcedure` via capabilities (no `role.includes`)
3. Server + UI helper exports
4. Unit tests for registry/capabilities; permissions integration smoke
5. Domain doc; backlog full router cutover

## Expected Files

- `packages/types/src/permissions.ts` (+ export + tests)
- `packages/api/src/trpc.ts`
- `packages/api/src/permissions.ts` (re-export / assertCan)
- `apps/web/src/lib/permissions.ts` (UI helper)
- docs YL-S3-*

## Firestore / Rules / Functions / Storage

NONE (app/API authorization only). Rules still use legacy roles until YL-S4.

## Security Impact

Office/admin gates follow settings permissions + field exclusions; read_only still blocked from write-capable office/admin procedures.

## Tests Required

- Unit: permissions helpers
- Existing permissions integration + auth session still pass
- `npm test`

## Out of Scope

- Replacing every `officeProcedure` with resource-specific `permissionProcedure` (BACKLOG)
- Firestore rules RBAC rewrite (YL-S4)
- YL-S4+
- Sneat WIP

## Risks

- Changing officeCapability mapping could lock out ops roles — mirror previous legacy mapping with tests
