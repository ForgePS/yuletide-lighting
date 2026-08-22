# Portal Legacy Magic-Token Hardening Plan

**STATUS:** S7A APPLIED (EMULATOR); S7B session-first cutover IN_PROGRESS — production migration NOT AUTHORIZED  
**ENVIRONMENT:** EMULATOR  
**DATE:** 2026-08-03  
**S7A CHECKPOINT SHA:** `472c2479066a9591974588297059e7aec59f1b2e`  
**Production writes / deploys:** PROHIBITED

## Proposed migration (original)

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

**PORTAL-P2-S5 note:** S5 adds route authorization and file access tickets only. It does not hash magic tokens, remove `customers.portalToken` plaintext, or change token URL compatibility.

## S6 interaction (2026-08-02)

Public-token flows (proposal/agreement/mockup/pay) remain on token URLs; S6 adds replay-safe transitions and server payment authority without changing token persistence model.

## S7A update (2026-08-02)

Checkpoint **PORTAL-P2-S7A** implements in emulator worktree:

- Canonical `hashPortalAccessToken` / `PORTAL_ACCESS_SECRET_DOMAIN = portal-magic-access`
- Hash-only **new** writes (`accessTokenHash`); no new plaintext dual-writes
- Centralized `resolvePortalMagicAccess` (hash-first, legacy COMPATIBILITY fallback, duplicate DENY)
- Session resolution decoupled from magic credential storage
- DTO leak removal; one-time enable/rotate delivery
- Emulator migration tool + `audit:portal-token-security`
- Evidence: `portal-phase-2-s7a-completion.md`

## S7B update (2026-08-03)

Checkpoint **PORTAL-P2-S7B** (IN_PROGRESS) focuses on session-first cutover:

- Canonical authenticated namespace `/portal/app/*` with `__portal_session` only
- Legacy `/portal/[token]/[[...segments]]` as entry shims → session exchange → `router.replace`
- Mapper `mapLegacyPortalPathToAppPath` / `translateLegacyPortalPathToSessionPath`
- URL / browser / logging evidence docs; emulator stages D–F (HASH_ONLY + plaintext removal)
- Production migration sequence remains **NOT AUTHORIZED** (see `portal-token-production-migration-plan.md`)

Evidence stubs: `portal-phase-2-s7b-completion.md` (gates pending). Do **not** start P2-S8.
