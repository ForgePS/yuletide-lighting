# YL-S11 Plan — Crew / mobile field harden

## Objective

EXTEND/HARDEN crew & mobile field ops (YL-S0 baseline YL-S11): fix over-inclusive “my schedule”, wire crew profile → Auth user mapping, assignment gates on field mutations, mobile Start + null-safe staff activity UI.

## Authorization

User authorized YL-S11. No production deploy.

## Deliverables

1. **`getCrewMySchedule` membership** — stop unioning all day events; match via `assignedCrewUserId`, mapped `assignedCrewId`, or day’s event crew profile owned by user; require scheduled day; soften missing customer/property drops
2. **Crew ↔ user mapping** — `schedule360.crews.update` + schedule crews UI for `assignedUserId`
3. **Assignment gates + mobile Start** — assert assignment before field mutations; wire `crew.startJob` on mobile; hydrate clock from `activeTimeEntryId`
4. **Null-safe staff crew activity + unit tests**

## Out of Scope

- Offline productization, materials UI, weather, Postgres crewRouter cleanup, production deploy
