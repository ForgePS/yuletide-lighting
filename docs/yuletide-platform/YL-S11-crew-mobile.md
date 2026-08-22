# YL-S11 — Crew / mobile field

## Problem

Crew “my schedule” showed every calendar job for the day; schedule crew profiles could not be linked to Auth users after S10; field mutations had no assignment gate; mobile lacked Start; staff activity dates could crash.

## Changes

- Pure membership + assignment helpers; schedule membership rewrite
- Crew profile `assignedUserId` API + schedule crews UI
- Mutation/getJob assignment asserts; mobile Start + clock hydrate
- Null-safe crew activity labels/dates

## Verification

Unit suite **265/265**. No production deploy.
