# YL-S16 Plan — Inventory harden

## Objective

EXTEND/HARDEN inventory (YL-S0 baseline YL-S16): null-safe labels, quantity/reservation consistency, fence dead dual routers, UI mutation permission gates—without production deploy.

## Authorization

User authorized YL-S16. No production deploy. No production Firestore writes.

## Deliverables

1. **Null-safe inventory labels** — `formatInventoryLabel` in types; wire managers, locations hub, table, item detail
2. **Quantity + reservation consistency** — fix damage/transfer double-count vs `computeAvailable`; available checks on assign/check-out; align allocate `jobMaterials` status with reserve pipeline; low-stock uses `reorderLevel` + `computeAvailable`; PO receive idempotency guard
3. **Fence dead dual routers** — deprecate/guard Postgres + legacy Firestore inventory routers toward inventory360
4. **UI permission gates** — `can(..., 'inventory', create|edit)` on mutation actions
5. **Unit tests** for labels, available math after damage/transfer semantics, low-stock formula, allocate status

## Out of Scope

- Production deploy / prod Firestore writes
- Full Postgres retirement (BACKLOG-008), historical jobMaterials migration
- Real AI forecasts, warehouse map / barcode camera UX
- Expanding inventory RBAC matrix
