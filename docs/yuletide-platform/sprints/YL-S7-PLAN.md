# YL-S7 Plan — Estimates / proposals (BACKLOG-002 + BACKLOG-003)

## Objective

Fix per-proposal Good/Better/Best package edit hydrate/persist, and harden Proposal Dashboard against null/undefined status.

## Authorization

User authorized YL-S7 for BACKLOG-002 + BACKLOG-003. No production deploy.

## Changes

1. **BACKLOG-003:** `statusClass` null-safe in `proposal-dashboard.tsx`
2. **BACKLOG-002 hydrate:** `buildPackageEditorDraftsFromProposalPackages` + form `defaultForm` loads `initial.packages`
3. **BACKLOG-002 persist:** `updateProposal360` replaces packages subcollection (does not embed `packages` on proposal doc)
4. Unit tests for hydrate helpers

## Out of Scope

- Org packageDefaults settings UI changes (already seed-only for new proposals)
- Wizard full package editor parity
- Production deploy

## Verification

- `npm test`
