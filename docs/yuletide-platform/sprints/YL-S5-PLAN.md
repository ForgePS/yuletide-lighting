# YL-S5 Plan — Resource-scoped `permissionProcedure` router cutover

## Objective

Close **YL-BACKLOG-012**: migrate CRM tRPC routers from broad `officeProcedure` / coarse `adminProcedure` gates to resource-scoped `permissionProcedure(resource, action)` / existing `requirePermission`, using the settings PermissionMatrix.

## Authorization

User authorized YL-S5. Scope: map onto **existing** `PermissionResource` values (no new matrix resources). Fix `office_staff` SYSTEM_ROLES bits so desk users are not locked out of proposals/mockups/reports/inventory after cutover. No production deploy.

## Current State

- YL-S3: registry + `permissionProcedure` + capability-based office/admin helpers
- Only sparse `permissionProcedure` usage (deletes + some settings edits)
- ~400 `officeProcedure` call sites remain across 360 routers
- `office_staff` matrix lacked `proposals` / `mockups` / `reports` / `inventory` / `settings.view` despite desk `officeProcedure` access today

## Changes Required

1. Expand `office_staff` SYSTEM_ROLES to desk CRM resources (+ `settings.view` only)
2. Replace `officeProcedure`/`adminProcedure` on routers with `permissionProcedure` per mapping table
3. Domain doc + tests (unit permissions; permissions/auth integration smoke)
4. Resolve BACKLOG-012

## Mapping (existing resources)

| Domain | view / create / edit / delete |
|--------|-------------------------------|
| customer360, contacts, portal, messages, reviews | `customers.*` |
| proposals360, agreements | `proposals.*` |
| jobs/schedule/crew/timeClock/serviceIssues/projectPrep/rebooking/commercial (ops) | `jobs.*` |
| invoices360 | `invoices.*` |
| inventory360, storage360 | `inventory.*` |
| mockups360 | `mockups.*` |
| reports360 (+ firestore reports) | `reports.*` |
| settings360, crm-ui-config writes, automation writes | `settings.*` |
| crm-ui get / onboarding state | `settings.view` |
| onboarding complete/update | `customers.edit` (desk setup; not full settings.edit) |
| import360 | entity → matching `*.create` |
| signTracker360 | already `sign_tracker.*` |

Deletes that used `adminProcedure` → `permissionProcedure(resource, 'delete')` when resource-scoped; org settings writes stay `settings.edit`.

## Out of Scope

- New PermissionResources
- Firestore rules PermissionMatrix rewrite (BACKLOG-007)
- Production deploy
- UI nav hiding redesign (may follow)

## Risks

- Roles without a resource bit lose access they previously had via coarse `officeProcedure` (intentional tightening, e.g. sales_rep vs invoices)
- Org-custom role matrices in Firestore may need ops review after cutover

## Verification

- `npm test` (types permissions + related)
- permissions + auth integration suites
- No Firebase production deploy
