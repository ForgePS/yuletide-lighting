# Yuletide Platform Backlog

Items discovered outside the active authorized sprint. Do not implement until authorized.

## YL-BACKLOG-001
Discovered During: YL-S0 (prior chat context)
Description: Integrate Sneat Theme from local zip `sneat-1.0.0.zip` into staff/app UI (scope TBD).
Reason Deferred: YL-S0 is documentation-only; framework/theme migration needs separate authorization (directive §12).
Suggested Sprint: YL-S18 (Admin / Application Shell) or dedicated theme sprint
Priority: MEDIUM
Blocking Current Sprint: NO

## YL-BACKLOG-002
Discovered During: YL-S0 (prior chat context)
Description: Per-proposal package editor must hydrate/persist proposal-scoped Good/Better/Best packages on edit; org `packageDefaults` remain system seed only under Settings / `/app/proposals/packages`.
Reason Deferred: Feature work; belongs under Estimates (YL-S7), not S0.
Suggested Sprint: YL-S7
Priority: HIGH
Blocking Current Sprint: NO

## YL-BACKLOG-003
Discovered During: YL-S0 (prior chat context)
Description: Proposal Dashboard can throw if `statusClass(p.status)` receives null/undefined (`status.includes`).
Reason Deferred: Bugfix not in S0 scope.
Suggested Sprint: YL-S7 or hotfix authorization
Priority: HIGH
Blocking Current Sprint: NO

## YL-BACKLOG-004
Discovered During: prior go-live / YL-S0
Description: Production portal magic-token migration → `PORTAL_MAGIC_TOKEN_MODE=HASH_ONLY`.
Reason Deferred: Production data migration requires explicit production authorization.
Suggested Sprint: after YL-S12 + separate prod auth
Priority: HIGH
Blocking Current Sprint: NO

## YL-BACKLOG-005
Discovered During: prior go-live / YL-S0
Description: Live production cross-org access probe (emulator isolation passed; prod verification still open).
Reason Deferred: Production reads need explicit authorization.
Suggested Sprint: YL-S4 / YL-S22
Priority: HIGH
Blocking Current Sprint: NO

## YL-BACKLOG-006
Discovered During: prior go-live / YL-S0
Description: Full lifecycle smoke (lead → proposal → pay → job → removal → renewal) on staging then production.
Reason Deferred: Ops/UAT; not S0.
Suggested Sprint: YL-S23
Priority: HIGH
Blocking Current Sprint: NO

## YL-BACKLOG-007
Discovered During: YL-S0 baseline
Description: Dual role systems (legacy 4 roles in rules vs settings 11 roles / permissions) and dual property/job path models need consolidation plan.
Reason Deferred: Architectural; map first in YL-S1/S3.
Suggested Sprint: YL-S1 / YL-S3
Priority: MEDIUM
Blocking Current Sprint: NO

## YL-BACKLOG-008
Discovered During: YL-S0 baseline
Description: `packages/db` Postgres/Drizzle + Clerk remnants — confirm retire vs retain.
Reason Deferred: Inventory only in S0.
Suggested Sprint: YL-S1 documentation follow-up
Priority: LOW
Blocking Current Sprint: NO

## YL-BACKLOG-009
Discovered During: YL-S0 baseline
Description: Node 20 Firebase Functions runtime deprecation (decommission 2026-10-30) — upgrade planning.
Reason Deferred: Infra; no deploy in S0.
Suggested Sprint: YL-S24
Priority: MEDIUM
Blocking Current Sprint: NO

## YL-BACKLOG-010
Discovered During: YL-S1
Description: Mirror `organizations.lifecycleStatus` inactive denials in Firestore security rules (`belongsToOrg`).
Reason Deferred: YL-S1 enforced app-layer only; rules changes belong in YL-S4.
Suggested Sprint: YL-S4
Priority: MEDIUM
Blocking Current Sprint: NO

## YL-BACKLOG-011
Discovered During: YL-S2
Description: Staging/production live E2E for Firebase Auth disabled-user denial (`verifyStaffIdToken` path).
Reason Deferred: Needs Auth emulator or staging credentials; unit classification covered in S2.
Suggested Sprint: YL-S23 or staging auth smoke extension
Priority: MEDIUM
Blocking Current Sprint: NO
