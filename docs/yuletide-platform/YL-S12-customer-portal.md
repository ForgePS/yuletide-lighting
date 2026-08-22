# YL-S12 — Customer portal

## Problem

Portal UI still crashed on null status/stage strings; invite claim sent users to `/portal/login` after minting a session; HASH_ONLY prod cutover needed readiness helpers without flipping production mode.

## Changes

- Shared `formatPortalStatusLabel` + portal page null-safety
- Invite success → `/portal/app`
- Hash-readiness summarizers for emulator/staff audits

## Verification

Unit suite **269/269**. No production deploy / no HASH_ONLY prod flip.
