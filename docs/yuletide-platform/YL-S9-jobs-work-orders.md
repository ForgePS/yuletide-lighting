# YL-S9 — Jobs / work orders

## Problem

Org job creates and customer Job History were on different paths; CRM `status` vs pipeline `stage` drifted; crew start incorrectly marked jobs `installed`; staff action buttons ignored common mid-pipeline stages; null stage/status could crash UI.

## Changes

- Org-scoped list for customer jobs with CRM projection helpers
- Shared mappers / action gates in `@clcrm/types`
- `crewStartJob` activity-only start (`startedAt`)
- Null-safe labels across staff pipeline, portal, Job History

## Verification

Unit suite **255/255**. No production deploy.
