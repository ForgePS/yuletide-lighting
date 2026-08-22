# YL-S8 — Contracts / acceptance

## Public sign gate

| Status | `/a/[token]` sign |
|--------|-------------------|
| `awaiting_signature` | Allowed |
| `draft` | Denied (must Send for signature first) |
| `active` / `signed` | Already signed (idempotent replay) |

Helpers: `canPublicSignAgreement`, `formatAgreementStatusLabel`, `isAgreementSignedStatus`.

## Staff send

Agreements list → **Send for signature** / **Copy link** / **Open** via `agreements360.sendForSignature`.
New manual agreements create as `draft`.

## Acceptance automation

`proposal_accepted` fires **once** inside `runProposalAcceptedWorkflow` (removed from `updateProposalStatus` + `recordPublicApproval`).

Portal notify `actionUrl` for agreements → `/a/{publicToken}`.

## Collection note

Canonical collection id is `multiYearAgreements` (docs that say `agreements` are drift).
