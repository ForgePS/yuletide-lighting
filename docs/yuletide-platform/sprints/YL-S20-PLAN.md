# YL-S20 Plan — Background jobs / Inngest harden

## Objective

EXTEND/HARDEN background jobs (YL-S0 baseline YL-S20): wire proposal follow-up to record-first outbound, honest invoice reminder status, active-org + feature-flag gates—without production deploy or live Twilio/Resend.

## Authorization

User authorized YL-S20. No production deploy. YL-S17 remains skipped.

## Deliverables

1. **Shared job helpers** — stale proposal candidate predicate, org lifecycle gate, honest reminder status from delivery mode
2. **Proposal follow-up send (record-first)** — `processProposalFollowUps` respects `followUpAutomation` flag + per-proposal toggle; records via `sendMessage360`; idempotent `followUpLastSentAt`
3. **Invoice overdue honesty** — reminders use `recorded`/`scheduled`/`sent` per delivery contract (no false `sent`)
4. **Inngest crons** — per-org loop; skip inactive orgs; call processors; return honest counts
5. **Unit tests** for helpers / candidate + status mapping

## Out of Scope

- Production deploy, live REAL_EMAIL/REAL_SMS cutover
- Full Day 1/3/7/14 cadence engine / automation360 merge
- OPTION A follow-up rules CRUD (P0.2 still deferred)
- New Inngest product surfaces beyond the two existing crons
