# YL-S14 — Messaging / notifications

## Problem

Staff messaging UI crashed on null status/category strings; outbound sends claimed `delivered` without a provider; notifications used a hardcoded `proposal_sent` trigger and automation double-wrote; public SMS had no signature fail-closed; dead SQL router could still hit Twilio/Resend if remounted.

## Changes

- Shared `formatMessageLabel` + null-safe template/classify helpers
- Honest `recorded`/`queued` outbound status + real notification triggers
- Safe-mode delivery helpers; SQL router provider gate
- Twilio signature verify fail-closed on public inbound SMS

## Verification

Unit suite **278/278**. No production deploy / no live Twilio/Resend.
