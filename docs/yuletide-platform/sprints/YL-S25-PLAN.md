# YL-S25 Plan — Renewals / rebooking harden

## Objective

EXTEND/HARDEN renewals/rebooking (YL-S0 baseline YL-S17, skipped earlier; filled as **YL-S25**): null-safe labels, shared eligibility helpers, `rebooking` module gate, permission/UI consistency, outreach idempotency—without production deploy or live campaign sends.

## Authorization

User authorized YL-S25. Domain = renewals/rebooking (catch-up for skipped YL-S17). No production deploy. No production Firestore writes.

## Deliverables

1. **Shared rebooking helpers** — null-safe labels; prior-season job eligibility; default season year; populate predicates aligned with lifecycle `isRebookingEligiblePipelineStage`
2. **Module + RBAC** — `requireModule('rebooking')` on rebooking360; align procedures to `customers` permissions (matches nav `permissionResource`)
3. **Outreach harden** — idempotent send (no double-status flip on terminal/already-sent); wire labels in staff UI
4. **UI permission gates** — create / populate / send / rebook / decline gated via `hasPermission`
5. **Unit tests** for labels, eligibility, season year, send idempotency predicates

## Out of Scope

- Production deploy / live Twilio/Resend campaign blasts
- Expanding PermissionResource matrix with dedicated `rebooking` resource
- HASH_ONLY / live portal OTP
- Full rebooking product redesign / multi-campaign A/B

## Next sprint

NOT AUTHORIZED automatically.
