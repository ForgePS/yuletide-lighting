# YL-S0 Plan — Repository / Firebase Baseline

## Objective

Establish an authoritative baseline of the existing Yuletide Lighting Firebase SaaS codebase before any modernization sprints.

## Authorization

`YULETIDE-FIREBASE-SAAS / YL-S0` only.

Documentation and minor baseline tooling/docs only. **NO** feature development, deploys, production writes, or sprint advancement.

## Current State

- Monorepo `yuletide-lighting` (npm workspaces + Turbo)
- Apps: `apps/web` (Next.js 15 Hosting SSR), `apps/mobile` (Expo crew)
- Packages: `api`, `firebase`, `types`, `validators`, `ui`, `db` (legacy)
- Firebase aliases in `.firebaserc`: `default`/`production` → `yuletide-lighting`, `staging` → `yuletide-lighting-staging`
- Prior production-cleanup / Portal Phase 2 / S8 go-live docs exist under `docs/production-cleanup/` and `docs/production-launch-checklist.md`

## Reuse

- Existing Firebase-first architecture, Auth, Firestore org nesting, tRPC API, Hosting frameworksBackend
- Existing security rules, emulator tests, portal session model, module entitlements

## Changes Required

1. Create `docs/yuletide-platform/` control + baseline artifacts
2. Inventory apps/packages/Firebase/capabilities
3. Run existing verification scripts; record results (no infinite repair)
4. Capture deferred product asks in BACKLOG (Sneat, package editor, etc.)
5. Commit docs only; STOP

## Expected Files

- `docs/yuletide-platform/PROGRAM_STATE.json`
- `docs/yuletide-platform/ACTIVE_SPRINT.md`
- `docs/yuletide-platform/BACKLOG.md`
- `docs/yuletide-platform/YL-S0-baseline.md`
- `docs/yuletide-platform/sprints/YL-S0-PLAN.md`
- `docs/yuletide-platform/sprints/YL-S0-COMPLETE.md`

## Firestore / Rules / Functions / Storage Changes

NONE (document only).

## Security Impact

NONE (no runtime changes).

## Tests Required

Run existing repo scripts only: unit, rules (if practical), lint/typecheck/build as time allows. Record failures; do not repair historical debt beyond documenting.

## Out of Scope

- YL-S1+
- Sneat theme
- Proposal package UX fixes
- Production/staging deploys
- New Firebase projects
- Schema migrations

## Risks

- Large dirty working tree may mix unrelated uncommitted files — commit **only** `docs/yuletide-platform/**`
- Shell/tool instability may limit full test matrix — document as limitation if runs incomplete
