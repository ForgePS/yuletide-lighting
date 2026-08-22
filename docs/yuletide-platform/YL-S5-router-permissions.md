# YL-S5 — Resource-scoped router permissions

## Goal

Staff tRPC procedures authorize with **PermissionMatrix bits** (`resource.action`) instead of coarse `officeProcedure` / capability-only desk gates.

## Mechanisms

| Gate | Meaning |
|------|---------|
| `permissionProcedure(resource, action)` | Exact matrix check (+ subscription + read_only write block) |
| `requirePermission` | Same middleware; used by sign-tracker aliases |
| `adminProcedure` | Deprecated for new code; still = `settings.edit` capability |
| `officeProcedure` | Deprecated for new code; still = desk capability |

Prefer `permissionProcedure` / `assertAuthCan` in routers and new code.

## Domain → resource map

| Domain routers | Resource |
|----------------|----------|
| customers, contacts, portal staff ops, messages, reviews | `customers` |
| proposals, agreements | `proposals` |
| jobs, schedule, crew, time clock, service issues, project prep, rebooking, commercial ops | `jobs` |
| invoices | `invoices` |
| inventory, storage | `inventory` |
| mockups | `mockups` |
| reports | `reports` |
| settings, crm-ui writes, automation writes | `settings` |
| sign tracker | `sign_tracker` |

## SYSTEM_ROLES change (office_staff)

Desk bundle now includes: customers, mockups, proposals, jobs, invoices, inventory, reports, sign_tracker (no delete/manage), plus **`settings.view` only**.

## Intentional tightening

Roles that previously passed `officeProcedure` via *any* `.view` bit now need the **specific** resource bit (e.g. `sales_rep` without `invoices` cannot hit invoice procedures).

## Deferred

- New PermissionResources for portal/schedule-specific grants
- Firestore rules matrix alignment (BACKLOG-007)
- UI-only permission hiding polish
