# Portal Legacy Magic-Token Hardening Plan

**STATUS:** DEFERRED — NOT APPLIED IN S3  
**ENVIRONMENT:** EMULATOR  
**Production writes / deploys:** PROHIBITED

Legacy magic access tokens, including `customers.portalToken`, remain plaintext for compatibility. Invitation and QR/OTP hashing in S3 does not remove this risk.

## Proposed migration

1. Inventory every reader, writer, URL, index, test fixture, and dual-write field for portal magic tokens.
2. Add versioned `accessTokenHash` storage with purpose-separated hashing; issue raw tokens only once.
3. Introduce dual-read (hash first, legacy fallback) with metrics that never log token values.
4. On verified legacy use, transactionally rotate to a new raw token, persist only its hash, and clear plaintext fields.
5. Backfill by rotation—not by hashing exposed exports—under a separately approved emulator/staging plan.
6. Update routes to exchange magic links for `__portal_session`, minimizing token lifetime in URLs/history.
7. Revoke on account suspension, explicit rotation, user revocation, and incident response.
8. Remove legacy queries, plaintext writes, indexes, and fields only after usage reaches zero and rollback criteria are approved.

## Required gates

- Cross-tenant isolation, replay, rotation, expiry, session invalidation, and concurrent-use tests.
- Log/analytics/referrer review and secret-scanning evidence.
- Backup/restore and rollback plan preserving S1/S2 controls.
- Separate security review, migration approval, deployment authorization, and production-write authorization.

No migration step in this plan is authorized by PORTAL-P2-S3.

**PORTAL-P2-S5 note:** S5 adds route authorization and file access tickets only. It does not hash magic tokens, remove `customers.portalToken` plaintext, or change token URL compatibility. The deferred migration plan above remains authoritative.

## S6 interaction (2026-08-02)

Public-token flows (proposal/agreement/mockup/pay) remain on token URLs; S6 adds replay-safe transitions and server payment authority without changing token persistence model. Legacy plaintext magic-token migration remains deferred.
