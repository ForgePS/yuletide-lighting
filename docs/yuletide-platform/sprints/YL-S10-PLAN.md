# YL-S10 Plan — Schedule / dispatch harden

## Objective

EXTEND/HARDEN scheduling (YL-S0 baseline YL-S10): fix job↔calendar sync gaps, stop writing schedule crew profile ids into `assignedCrewUserId`, null-safe schedule UI labels, Schedule action on job detail.

## Authorization

User authorized YL-S10. No production deploy.

## Deliverables

1. **createEventFromJob / createCalendarEvent harden** — no empty `customerId`; job write-back uses schedule `assignedCrewId` + optional mapped `assignedUserId` (never profile id as user id)
2. **Job ↔ calendar sync** — move/update sync job times + crew; `getJob360` picks primary (latest) event for a job
3. **Null-safe schedule UI + JobDetail Schedule** — harden `.replace` labels; Schedule modal on job detail when `canScheduleJob`
4. **Unit tests** for label/crew helpers + primary-event picker

## Out of Scope

- Weather provider, AI/season productization, full scheduleBlocks migration, crew/mobile (YL-S11), production deploy
