# YL-S1 Plan — Core Organization / User Domain

## Objective

Establish authoritative organization + user ownership using the **existing** single-`organizationId` membership model. Harden org lifecycle status. Document membership as user→org binding (no new memberships collection).

## Authorization

`AUTHORIZE YULETIDE YL-S1` (user confirmed 2026-08-10).

## Current State

- `users/{uid}` carries `organizationId`, `role`, `settingsRole`, `status` (active|suspended|pending|archived)
- `organizations/{orgId}` has subscription fields + provisioning; **no lifecycle status** distinct from `subscriptionStatus`
- `resolveAppAccess` denies inactive/pending **users** and missing org; does **not** check org lifecycle
- Cross-org isolation covered by integration tenant tests + Firestore rules tests
- Explicit multi-membership collection: **not present** → REUSE single-org binding (BACKLOG if multi-org membership needed later)

## Reuse

- UserRecord / OrganizationRecord / ensureOrganization / ensureUser
- Auth session integration tests
- Tenant isolation integration tests
- Org provisioning fields

## Changes Required

1. Add `OrganizationLifecycleStatus` + membership helpers in `@clcrm/types`
2. Add `lifecycleStatus` on OrganizationRecord (default active for legacy)
3. Domain helpers `organization-access.ts` (membership assert, org active check)
4. Wire `resolveAppAccess` + `resolveTestSession` to deny inactive org lifecycle
5. Unit + integration tests for membership + org lifecycle denial
6. Domain doc under `docs/yuletide-platform/`
7. Access-denied copy for `org_inactive`

## Expected Files

- `packages/types/src/organization.ts` (+ export)
- `packages/firebase/src/organization-access.ts` (+ test + export)
- `packages/firebase/src/firestore.ts` (field + ensure default)
- `apps/web/src/lib/auth.ts`
- `apps/web/src/app/access-denied/page.tsx`
- `tests/integration/setup/*` + auth/org domain tests
- `docs/yuletide-platform/sprints/YL-S1-*.md`
- `docs/yuletide-platform/YL-S1-organization-domain.md`

## Firestore / Rules / Functions / Storage

- Firestore schema: additive optional `lifecycleStatus` only
- Rules: **no change this sprint** (app-layer gate; rules org lifecycle → YL-S4 backlog if needed)
- Functions/Storage/Auth providers: none

## Security Impact

Staff access denied when org `lifecycleStatus` ∈ inactive|suspended|archived. Missing field = active (legacy).

## Tests Required

- Unit: organization-access helpers
- Integration: org lifecycle denial; existing membership/cross-org still pass
- `npm test`; targeted integration auth/tenants if emulator available

## Out of Scope

- YL-S2+ session/token hardening beyond this gate
- Explicit memberships collection / tenant switcher
- Dual role consolidation (YL-S3)
- Firestore rules rewrite (YL-S4)
- Sneat / proposal package WIP
- Production deploy

## Risks

- Dirty WIP on branch — commit only S1 files
- Confusing `lifecycleStatus` vs `subscriptionStatus` — document clearly
