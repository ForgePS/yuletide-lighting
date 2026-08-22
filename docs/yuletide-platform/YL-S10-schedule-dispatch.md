# YL-S10 — Schedule / dispatch

## Problem

Scheduling created calendar events but poisoned `assignedCrewUserId` with crew profile ids, left job fields stale on move/update, dropped overlapping events in range filters, and could crash on null status labels. Job detail had no Schedule action.

## Changes

- Crew assignment resolver + optional `CrewProfile.assignedUserId`
- Job sync from calendar create/move/update; primary event picker for job detail
- Null-safe schedule labels across staff + portal; Schedule on JobDetail

## Verification

Unit suite **259/259**. No production deploy.
