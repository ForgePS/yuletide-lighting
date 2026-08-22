# YL-S4 — Org lifecycleStatus in Firestore rules

## Summary

`belongsToOrg` now requires an existing organization document whose `lifecycleStatus` is not in the inactive set (`inactive` | `suspended` | `archived`). Missing `lifecycleStatus` remains treated as active (legacy), matching app-layer helpers.

## Helpers (`firestore.rules`)

- `orgPath(orgId)` / `orgDoc(orgId)` — read org root
- `isOrgLifecycleActive(orgId)` — exists + (no field OR not in inactive set)
- `belongsToOrg` — active user + matching `organizationId` + `isOrgLifecycleActive`
- `hasRole` unchanged shape; inherits lifecycle via `belongsToOrg`

## Semantics alignment

| Condition | App (`evaluateOrganizationAccess`) | Rules |
|-----------|--------------------------------------|-------|
| Org missing | deny `no_org` | deny (`exists` required) |
| Field missing | active | active |
| `active` | allow | allow |
| `inactive` / `suspended` / `archived` | deny `org_inactive` | deny |
| Unknown string | normalize → active | allow (not in deny list) |

## Not changed

- Legacy role strings on path rules (BACKLOG-007)
- Storage rules org lifecycle (optional follow-up)
- PermissionMatrix / settingsRole enforcement in rules

## Dual-role caveat (BACKLOG-007)

Client rules still gate on `user.role` ∈ `{owner,admin,office,crew}`. API authorization uses settings PermissionMatrix / capabilities (YL-S3). Org lifecycle is now consistent across app + Firestore rules; role model consolidation remains open.
