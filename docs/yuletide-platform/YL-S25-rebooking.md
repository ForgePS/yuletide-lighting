# YL-S25 — Renewals / rebooking (YL-S17 catch-up)

## Problem

YL-S0 assigned renewals/rebooking to **YL-S17**, which was skipped. Staff rebooking360 lacked module gating, shared eligibility helpers, null-safe labels, and UI permission gates.

## Changes

- Helpers + unit tests in `@clcrm/types` `rebooking.ts`
- `requireModule('rebooking')` + customers RBAC on `rebooking360` router
- Populate/send/process use shared eligibility and idempotency predicates
- Staff UI labels + `hasPermission` on mutations

## Verification

Unit suite **320/320**. No production deploy.
