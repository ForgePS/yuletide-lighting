# YL-S11 Complete — Crew / mobile field harden

**STATUS:** COMPLETE  
**VERDICT:** PASS  
**Date:** 2026-08-12  

## Scope completed

1. **`getCrewMySchedule` membership** — assignment via user id, mapped crew profile, or day-event crew owned by user; no more all-day-event union; unscheduled jobs no longer appear every day; missing customer/property no longer drops the job
2. **Crew ↔ user mapping** — `schedule360.crews.updateAssignedUser` + Field user select on schedule crews page
3. **Assignment gates + mobile Start** — field mutations/`getJob` require assignment; Start on home + job detail; clock hydrate from `activeTimeEntryId`
4. **Null-safe staff crew activity** + unit tests for membership helpers

## Verification

| Check | Result |
|-------|--------|
| Unit `npm test` | **PASS** 265/265 |
| Production deploy | **NONE** |

## Deferred

- Offline productization, materials UI, weather, Postgres crewRouter cleanup, production deploy

## Next sprint

**NOT AUTHORIZED.**
