# YL-S20 Complete — Background jobs / Inngest harden

**STATUS:** COMPLETE  
**VERDICT:** PASS  
**Date:** 2026-08-13  

## Scope completed

1. **Shared job helpers** — `shouldRunBackgroundJobsForOrg`, `isProposalFollowUpCandidate`, `resolveInvoiceReminderStatus`, path/org helpers
2. **Proposal follow-up send (record-first)** — `processProposalFollowUps` gates on org lifecycle + `followUpAutomation` flag + per-proposal toggle; records via `sendMessage360`; idempotent `followUpLastSentAt`
3. **Invoice overdue honesty** — reminder rows use `recorded`/`scheduled`/`sent` (no false provider `sent`)
4. **Inngest crons** — per-org loops; skip inactive orgs; call processors; honest counts
5. **Unit tests** — lifecycle gate, candidate selection, reminder status mapping, labels

## Verification

| Check | Result |
|-------|--------|
| Unit `npm test` | **PASS** 304/304 |
| Production deploy | **NONE** |
| Live Twilio/Resend | **NOT enabled** |

## Deferred

- Live REAL_EMAIL / REAL_SMS cutover for cron deliveries
- Full Day 1/3/7/14 follow-up cadence / automation360 merge
- OPTION A follow-up rules CRUD (P0.2)
- YL-S17 renewals/rebooking (still skipped)

## Next sprint

**NOT AUTHORIZED.**
