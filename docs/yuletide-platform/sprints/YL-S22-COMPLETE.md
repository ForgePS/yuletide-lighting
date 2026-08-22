# YL-S22 Complete — Public token / security harden

**STATUS:** COMPLETE  
**VERDICT:** PASS  
**Date:** 2026-08-13  

## Scope completed

1. **Shared public-token helpers** — `normalize` / `isValid` / `parse` (len 16–128, URL-safe charset); `generatePublicAccessToken()` = `nanoid(32)`
2. **Fail-closed lookups** — `getByPublicToken`, review + mockup token finders reject invalid shapes before collectionGroup query
3. **Aligned public inputs** — `publicAccessTokenSchema` on proposals/invoices/agreements/reviews/mockups/rebooking + legacy firestore routers + Stripe checkout
4. **Rotate API** — `rotateRecordPublicToken` + `proposals360.rotatePublicToken` / `invoices360.rotatePublicToken`
5. **Unit tests** — reject weak tokens; accept generated shape; Zod fail-closed

## Verification

| Check | Result |
|-------|--------|
| Unit `npm test` | **PASS** 310/310 |
| Production deploy | **NONE** |
| HASH_ONLY prod cutover | **NOT done** (BACKLOG-004) |
| Live cross-org probe | **NOT done** (BACKLOG-005) |

## Deferred

- Portal HASH_ONLY production cutover
- Live production cross-org probe
- At-rest hashing of CRM `publicToken`
- Integration seed tokens shorter than 16 chars (update when running portal integration suite)
- Staff UI buttons for rotate (API ready)

## Next sprint

**NOT AUTHORIZED.**
