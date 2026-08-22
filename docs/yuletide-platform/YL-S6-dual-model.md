# YL-S6 — Dual role / path consolidation (BACKLOG-007)

## Twin problems

### A. Dual role models

| Layer | Source of truth today |
|-------|----------------------|
| API (YL-S5) | `settingsRole` + PermissionMatrix via `permissionProcedure` |
| Client Firestore rules | Legacy `users.role` ∈ {owner, admin, office, crew} *(bridged in YL-S6)* |
| Storage rules | Legacy `role` allow-list (broader; not fully bridged this sprint) |

### B. Dual property / job paths

| Path | Status |
|------|--------|
| `organizations/{orgId}/properties/{id}` | Org-level SoT candidate |
| `organizations/{orgId}/customers/{id}/properties/{id}` | Nested CRM path still active |
| Parallel jobs under customer vs org `jobs` | Historical dual write risk |

**Decision (YL-S6):** Document only — do **not** migrate paths this sprint. Future slice: inventory writers, choose canonical path, dual-read period, then fail-closed writes.

## Role bridge (shipped YL-S6)

Authoritative mapping (`mapSettingsRoleToLegacyRole`):

| settingsRole | Legacy bucket |
|--------------|---------------|
| owner | owner |
| administrator | admin |
| sales_manager, sales_rep, operations_manager, dispatcher, office_staff | office |
| crew_leader, installer, warehouse_staff | crew |
| read_only | read_only (never matches office/admin hasRole arrays) |

Rules: `effectiveLegacyRole()` prefers `settingsRole` when present; else `users.role`.

App sync: `updateUser` writes both `settingsRole` and mapped `role`.

### Fix included

`dispatcher` previously synced to legacy `crew` in settings360; now **office** to match desk `hasOfficeCapability`.

## End state (future, not this sprint)

1. Rules eventually evaluate PermissionMatrix (or drop direct client SDK for CRM writes)
2. Single property + job path SoT with dual-read then delete nested writers
3. Retire `users.role` after backfill or keep as denormalized cache only

## Storage note

`storage.rules` still uses a broader legacy role allow-list and does not mirror `settingsRole` / org `lifecycleStatus`. Follow-up when Storage hardening is authorized.
