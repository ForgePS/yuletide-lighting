# YL-S4 Plan — Org lifecycleStatus in Firestore rules

## Objective

Close **YL-BACKLOG-010**: mirror application-layer `organizations.lifecycleStatus` inactive denials inside Firestore security rules via `belongsToOrg`, so direct client SDK access cannot bypass the YL-S1 org gate.

## Authorization

User: authorized YL-S4 — BACKLOG-010 only (rules + tests). No PermissionMatrix rewrite. No production deploy.

## Current State

- App/API: `evaluateOrganizationAccess` / `isOrganizationLifecycleActive` deny `inactive` | `suspended` | `archived`; missing field ⇒ active
- Rules: `belongsToOrg` checked user membership + user `status` only — **no** org lifecycle
- Storage rules: staff org + user status only — out of scope (note follow-up)

## Reuse

- Types: `OrganizationLifecycleStatus`, `INACTIVE_ORGANIZATION_LIFECYCLE_STATUSES`
- Existing `belongsToOrg` / `hasRole` cascade (single helper change covers collections)
- Rules unit harness: `tests/firebase/*`

## Changes Required

1. Add `orgPath` / `orgDoc` / `isOrgLifecycleActive` helpers
2. Extend `belongsToOrg` to require active org lifecycle (exists + not inactive set)
3. Seed org roots in rules tests; add lifecycle + cross-org isolation cases
4. Domain/sprint docs; resolve BACKLOG-010

## Expected Files

- `firestore.rules`
- `tests/firebase/helpers.ts`
- `tests/firebase/firestore.rules.test.ts`
- `docs/yuletide-platform/sprints/YL-S4-PLAN.md`
- `docs/yuletide-platform/sprints/YL-S4-COMPLETE.md`
- `docs/yuletide-platform/YL-S4-org-lifecycle-rules.md`
- `docs/yuletide-platform/BACKLOG.md` / `PROGRAM_STATE.json`

## Firestore / Rules / Functions / Storage

- **Firestore rules:** yes (BACKLOG-010)
- **Storage rules:** note only — no change this sprint
- **Functions / Auth providers:** none
- **Production deploy:** none

## Security Impact

Inactive/suspended/archived orgs deny client reads/writes through all `hasRole`/`belongsToOrg` paths. Reactivation remains Admin SDK / server path (client update also gated when inactive).

## Tests Required

- `npm run test:firestore-rules`
- New: inactive|suspended|archived deny; missing field allow; cross-org still denied

## Out of Scope

- Full rules RBAC / PermissionMatrix rewrite (**BACKLOG-007**)
- Storage lifecycle mirror (optional follow-up note)
- Full `permissionProcedure` router migration (**BACKLOG-012**)
- Production deploy / Firebase production writes

## Risks / BACKLOG-007 caveats

- Rules still authorize on legacy `role` (`owner`/`admin`/`office`/`crew`); API uses settings PermissionMatrix — dual model unchanged
- Storage staff role list remains broader than Firestore — do not “fix” in S4
- User `status` vs org `lifecycleStatus` stay separate concepts
