# YL-S16 — Inventory

## Problem

Inventory UI crashed on null status strings; damage/transfer double-counted vs `computeAvailable`; allocate wrote `jobMaterials` status that consume never picked up; PO receive could double stock; legacy Postgres + thin Firestore inventory routers diverged from inventory360; hub mutations lacked UI permission gates.

## Changes

- Shared `formatInventoryLabel` + quantity helpers (`applyDamageQuantityUpdate`, `applyAssignmentTransferUpdate`)
- Carve-out semantics for damage/assignment; available checks; allocate→`reserved`; idempotent PO receive
- Legacy routers fenced/shimmed to inventory360
- Hub/detail create/edit/damage gated by `inventory` permissions

## Verification

Unit suite **288/288**. No production deploy.
