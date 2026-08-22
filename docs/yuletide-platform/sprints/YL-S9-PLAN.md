# YL-S9 Plan — Jobs / work orders harden

## Objective

EXTEND/HARDEN jobs & work orders (YL-S0 baseline YL-S9): fix customer job dual-read mismatch, null-safe stage/status display, stop crew start jumping to `installed`, align create defaults + staff action gates with the pipeline.

## Authorization

User authorized YL-S9. No production deploy.

## Deliverables

1. **Customer jobs dual-read:** `listCustomerJobs` reads org `jobs` by `customerId`; map org `stage` ↔ CRM `status` for Job History
2. **Null-safe stage/status display:** harden `formatStage` + portal jobs + Job History (no `.replace` on null)
3. **Stage transition + staff actions:** fix `crewStartJob` (no jump to `installed`); `createOrgJob` / `createCustomerJob` default into pipeline; Reserve / Schedule / Mark installed gates match real mid-stages
4. **Unit tests** for status↔stage mappers, action gates, null-safe labels

## Out of Scope

- Full dual-path data migration, schedule product (YL-S10), crew/mobile product (YL-S11), inventory depth (YL-S16), production deploy
