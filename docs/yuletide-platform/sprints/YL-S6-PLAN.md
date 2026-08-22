# YL-S6 Plan — Dual role/path consolidation (BACKLOG-007) + rules bridge

## Objective

Document the dual-model consolidation plan for legacy vs settings roles and dual property/job paths, and ship a **safe first slice**: Firestore rules prefer `settingsRole` mapped onto legacy `hasRole` buckets with legacy `users.role` fallback.

## Authorization

User authorized YL-S6 with: plan doc + rules `settingsRole` bridge (keep legacy fallback). No production deploy. No full PermissionMatrix-in-rules rewrite. Dual path cutover deferred.

## Changes

1. Domain consolidation doc (`YL-S6-dual-model.md`)
2. `mapSettingsRoleToLegacyRole` / `resolveLegacyRoleForRules` in `@clcrm/types`
3. `firestore.rules` `effectiveLegacyRole()` → `hasRole`
4. Sync `settings360` user role updates to shared mapper (fixes dispatcher→crew drift)
5. Rules unit tests for override / installer / read_only / legacy fallback

## Out of Scope

- Full rules PermissionMatrix rewrite
- Canonical property/job path migration (documented only)
- Storage rules lifecycle + settingsRole full parity (note only)
- Production deploy

## Verification

- `npm run test:firestore-rules`
- `npm test` (mapper unit coverage)
