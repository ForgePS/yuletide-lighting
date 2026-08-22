# YL-S16 Complete — Inventory harden

**STATUS:** COMPLETE  
**VERDICT:** PASS  
**Date:** 2026-08-13  

## Scope completed

1. **Null-safe inventory labels** — `formatInventoryLabel` on managers, locations hub, table, item detail
2. **Quantity + reservation consistency** — damage/transfer carve-outs (no double-count vs `computeAvailable`); available checks on assign/check-out/truck; allocate `jobMaterials` → `reserved`; PO receive idempotent; legacy low-stock → inventory360 formula
3. **Fence dead dual routers** — Firestore legacy `inventory` → inventory360 shim; Postgres inventory router throws PRECONDITION_FAILED
4. **UI permission gates** — create/edit/adjust/damage gated via `hasPermission(..., 'inventory', ...)`
5. **Unit tests** — labels, damage/transfer math, available gates

## Verification

| Check | Result |
|-------|--------|
| Unit `npm test` | **PASS** 288/288 |
| Production deploy | **NONE** |
| Production Firestore writes | **NONE** |

## Deferred

- Full Postgres retirement (BACKLOG-008), historical jobMaterials migration
- Real AI forecasts, warehouse map / barcode camera UX
- Production deploy

## Next sprint

**NOT AUTHORIZED.**
