# S8 Production Rollback Runbook

**PHASE:** PORTAL-P2-S8  
**APPLY:** Only after a separately authorized production deploy that must be reversed

## Principles

- Prefer Hosting version rollback + feature disable over data rewrites
- Do **not** rollback to code that reintroduces plaintext **new** portal token writes or isolation bypasses
- Portal token plaintext removal is not part of day-1; do not "fix" by mass regenerating customer links

## Hosting

1. Firebase Hosting release history → roll to previous known-good version for `yuletide-lighting`
2. Confirm `/` and `/api/health`

## Functions / frameworksBackend

1. Redeploy previous Hosting/backend revision tied to known-good SHA
2. If only config bad: revert env / disable payment/email providers

## Firestore / Storage rules

1. Redeploy previous known-good `firestore.rules` / `storage.rules` from git tag
2. Indexes: prefer additive leave-in-place; do not delete indexes in panic

## Feature / emergency disables

- Disable customer portal module flag / org feature if portal incident
- Disable Stripe live keys (swap to test or unset)
- Disable Resend/Twilio keys

## Portal-specific

- Revoke compromised portal accounts via staff tools if available
- Prefer sessionVersion bump / revoke over mass token rewrite
- Keep COMPATIBILITY resolver behavior unless HASH_ONLY was explicitly enabled

## Data

- No unsupervised restore overwrite
- Use Firestore PITR/export only with explicit ops authorization

## Communication

- Record trigger, SHA from, SHA to, time, operator
