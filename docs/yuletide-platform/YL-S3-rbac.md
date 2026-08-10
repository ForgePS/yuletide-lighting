# YL-S3 — RBAC / Permissions

## Model

```text
SettingsRole (11) ──► PermissionMatrix (resource × action)
Legacy UserRole (4) ──► still on AuthContext.role for Firestore rules / coarse maps
```

Prefer **permission / capability helpers** over `auth.role === 'admin'`.

## Registry

- Namespaced keys: `customers.view`, `settings.edit`, …
- Source: `packages/types/src/permissions.ts` (`PERMISSION_REGISTRY`)
- Role bundles: `SYSTEM_ROLES` in `settings.ts`

## Server gates (`@clcrm/api`)

| Procedure | YL-S3 rule |
|-----------|------------|
| `permissionProcedure(resource, action)` | Exact matrix bit |
| `adminProcedure` | `hasAdminCapability` → `settings.edit` (blocks read_only) |
| `officeProcedure` | `hasOfficeCapability` → non-field role with any resource `view` |

Field-only settings roles (`installer`, `crew_leader`, `warehouse_staff`) cannot use `officeProcedure` (same net effect as prior legacy `crew` mapping).

Helpers: `authCan`, `assertAuthCan`.

## UI

`apps/web/src/lib/permissions.ts` — `userCan`, `userIsAdmin`, `userIsOffice`.

## Not done this sprint

- Convert every router from `officeProcedure` → resource-specific `permissionProcedure` (BACKLOG-012)
- Align Firestore rules with PermissionMatrix (YL-S4 / BACKLOG-007)
