# YL-S22 Plan — Public token / security harden

## Objective

HARDEN public CRM access tokens (YL-S0 YL-S22): shared normalize/validate/generate helpers, fail-closed Admin SDK lookups, aligned public Zod + Stripe checkout—without production deploy, HASH_ONLY cutover, or live cross-org probe.

## Authorization

User authorized YL-S22. No production deploy.

## Deliverables

1. **Shared public-token helpers** — normalize, isValid (len 16–128, URL-safe charset), generate (`nanoid(32)`)
2. **Fail-closed lookups** — `getByPublicToken`, review/mockup token finders reject invalid shapes before collectionGroup query
3. **Align public inputs** — Zod schemas + Stripe checkout use shared validator
4. **Rotate helpers** — staff-safe regenerate for proposal/invoice `publicToken` (API)
5. **Unit tests** + keep/confirm Firestore mirror deny rules (no prod deploy)

## Out of Scope

- HASH_ONLY portal magic cutover (**YL-BACKLOG-004**)
- Live production cross-org probe (**YL-BACKLOG-005**)
- At-rest hashing of CRM `publicToken` (breaks equality lookup)
- Production Firebase rules/deploy
- Referral `nanoid(4)` marketing codes
