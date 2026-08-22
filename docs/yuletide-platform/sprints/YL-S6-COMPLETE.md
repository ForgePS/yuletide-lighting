# YL-S6 Complete — Dual model plan + settingsRole rules bridge

**STATUS:** COMPLETE  
**VERDICT:** PASS  
**Date:** 2026-08-10  

## Scope completed

- BACKLOG-007 consolidation plan documented (`YL-S6-dual-model.md`)
- Firestore rules `effectiveLegacyRole()` prefers `settingsRole` → legacy buckets; falls back to `users.role`
- Shared mappers in `@clcrm/types`; `settings360` user updates use mapper (dispatcher → office)
- Rules tests suite D2 for override / installer / dispatcher / read_only / legacy fallback

## Reused

- Existing `hasRole` path allow-lists (no per-collection PermissionMatrix rewrite)
- YL-S4 `belongsToOrg` lifecycle gate

## Hardened

- Stale `users.role` no longer wins when `settingsRole` is set
- `read_only` settings role cannot pass office/admin/crew `hasRole` arrays
- Dispatcher desk access aligned in rules sync (was incorrectly crew)

## Firestore / Rules / Storage

- Firestore rules: updated (role bridge only)
- Storage rules: unchanged (follow-up noted)
- Dual property/job path migration: documented only
- Production deploy: **NONE**

## Verification

| Check | Result |
|-------|--------|
| Unit `npm test` | **PASS** |
| `npm run test:firestore-rules` | **PASS** 17/17 |
| Production deploy | **NONE** |

## Repair passes used

0 / 2

## Deferred

- Full PermissionMatrix-in-rules → later under remaining BACKLOG-007 path work
- Canonical property/job path cutover
- Storage settingsRole + lifecycle mirrors
- Production rules deploy

## Next sprint

**NOT AUTHORIZED.**
