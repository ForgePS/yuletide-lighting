# YL-S19 — Reporting

## Problem

Report year/season filters mixed paidAt-only vs updated dates; funnel invented lead counts; daily/weekly KPIs still showed “today” for historical years; `commandCenter` lacked reports RBAC; dual legacy `reports` routers competed with reports360; UI used raw snake_case and ungated export/create.

## Changes

- Shared helpers in `@clcrm/types` (`formatReportLabel`, `invoicePaidDate`, year/season, `buildSalesFunnelStages`)
- `reports360` firebase + API: consistent paid dates, honest current-year-only today/week, module+permission gates
- Legacy Firestore/Postgres `reports` fenced; UI export/create/run gated; empty states + labels

## Verification

Unit suite **299/299**. No production deploy.
