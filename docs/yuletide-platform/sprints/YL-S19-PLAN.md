# YL-S19 Plan — Reporting harden

## Objective

EXTEND/HARDEN reporting (YL-S0 baseline YL-S19): year/season/paid-date consistency, permission+module gates, fence dual legacy routers, null-safe labels + empty states—without production deploy.

## Authorization

User authorized YL-S19. No production deploy.

## Deliverables

1. **Year/season/paid-date consistency** — shared helpers; align executive/revenue/commandCenter; honest today/week when year selected
2. **Permission + module gates** — `requireModule('reports')`; commandCenter → `reports.view`; UI `can()` on export/create
3. **Fence dual routers** — legacy Firestore + Postgres `reports` → reports360 / fail-closed
4. **Null-safe labels + empties** — `formatReportLabel`; BarList/DataTable empty states
5. **Unit tests** for paid-date/year/season helpers and labels

## Out of Scope

- Production deploy, real AI forecasts, live scheduled email/PDF
- Full Postgres retirement, expanding RBAC beyond reports
- New report product surfaces
