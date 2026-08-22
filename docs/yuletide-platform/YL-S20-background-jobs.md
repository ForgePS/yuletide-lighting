# YL-S20 — Background jobs / Inngest

## Problem

`proposal-follow-up` cron queried stale viewed proposals but never sent/recorded outbound. Invoice reminder processor always wrote `status: 'sent'` with no provider. Crons did not skip inactive orgs or respect `followUpAutomation` flags.

## Changes

- Pure helpers in `@clcrm/types` (`background-jobs.ts`)
- `processProposalFollowUps` / `processOrgInvoiceReminders` in firebase
- Honest `ReminderStatus` including `recorded`
- Inngest functions call per-org processors with lifecycle gates

## Verification

Unit suite **304/304**. No production deploy. Live provider delivery still deferred.
