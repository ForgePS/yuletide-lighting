# Permission Inventory (Phase 0)

**Date:** 2026-07-30  
**Evidence:** `packages/api/src/trpc.ts`, `packages/types/src/settings.ts`, `apps/web/src/lib/auth.ts`

## Dual role systems (launch risk)

| System | Values | Used by |
|--------|--------|---------|
| Legacy coarse roles | `owner \| admin \| office \| crew` | `adminProcedure`, `officeProcedure` |
| Settings roles | 11 slugs (`SettingsRole`) | Settings UI, `settingsRole` on user, permission matrix |
| Portal roles | 5 portal user roles | Customer portal |

**Mapping issue:** `normalizeLegacyRole` maps `read_only` → legacy `crew` (write-capable coarse gate). This violates the directive’s “Do not map read_only to a broad crew role.”

## Permission matrix

**Resources:** customers, mockups, proposals, jobs, invoices, inventory, reports, settings  
**Actions:** view, create, edit, delete, export, approve  

Stored per role in org `roles` collection; seeded from `SYSTEM_ROLES`.

## Enforcement sparsity (verified)

### `permissionProcedure` — only ~8 procedures

- settings360: updateCompany, updateBranding, updateUser, inviteUser, updateRolePermissions  
- customer360.delete, proposals360.delete, invoices360.delete  

Most mutations use `officeProcedure` / `adminProcedure` only.

### `requireModule` — only

- `projectPrep360` (`jobs`)
- `schedule360.routes.list` / `.optimize` (`routes`)

### Fail-open module middleware

```ts
// packages/api/src/trpc.ts — requireModule
// If org lookup fails, allow through (fail open for ops resilience)
```

Also: empty `enabledModules` array does **not** deny access.

**Directive requirement:** fail closed. Current behavior is a **launch blocker**.

## Platform creator

- Env lists: `PLATFORM_CREATOR_EMAILS`, `PLATFORM_CREATOR_UIDS`
- Empty lists: local tip allows all signed-in users (`.env.example`)
- No Firebase custom claims / audited platform-user record yet

## Nav vs security

Navigation hides modules via `resolveCrmNavItems`, but API generally does not re-check. Hidden nav is **not** a security boundary.

## Required Phase 3 outcomes (not done in Phase 0)

- Single canonical role/permission model
- Fail-closed module + permission + subscription gates on every protected procedure
- Automated isolation tests expanded beyond current 7 cases
- Creator role via secure server-side mechanism + break-glass docs
