# YL-S8 Plan — Contracts / acceptance harden

## Objective

EXTEND/HARDEN contracts & acceptance (YL-S0 baseline YL-S8): wire send-for-signature, harden public `/a/[token]`, real acceptance idempotency tests, stop double `proposal_accepted` automation / broken notify links.

## Authorization

User authorized YL-S8. No production deploy.

## Deliverables

1. Staff **Send for signature** on agreements list (+ create as `draft` so send works)
2. Public `/a/[token]` null-safe status; sign only when `awaiting_signature`
3. Acceptance helper exports + stronger unit tests for idempotency matching
4. Single `proposal_accepted` fire (workflow only); portal notify `actionUrl` → `/a/{token}`

## Out of Scope

- PDF/DocuSign, collection rename, production deploy, full lifecycle smoke
