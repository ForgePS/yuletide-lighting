# YL-S7 — Estimates package editor

## Seed vs proposal-scoped packages

| Source | When used |
|--------|-----------|
| Org Settings `packageDefaults` (`/app/proposals/packages`) | New proposal seed only |
| `organizations/{org}/proposals/{id}/packages/*` | Authoritative per-proposal G/B/B |

## Edit flow (BACKLOG-002)

1. `getById` returns `packages` from subcollection
2. `ProposalForm` hydrates drafts via `buildPackageEditorDraftsFromProposalPackages`
3. Save calls `proposals360.update` with `packages` payload
4. `updateProposal360` → `replaceProposalPackages360` (delete all + recreate)

## Dashboard (BACKLOG-003)

`statusClass(status)` treats non-string as `''` before `.includes`.
