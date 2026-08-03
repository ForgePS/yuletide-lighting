# Portal Phase 2 S7 — Completion

**PHASE:** PORTAL-P2-S7 Legacy Magic-Token Hardening, Hash-Only Storage, and Session-First URL Cutover
**STATUS:** NOT COMPLETE — superseded by checkpoint reports (`portal-phase-2-s7a-completion.md`; S7B pending)
**DATE:** 2026-08-02
**ENVIRONMENT:** EMULATOR

## Checkpoints

| Item               | Value                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| S7 WORKTREE/BRANCH | `C:\Users\jerem\Projects\christmas-light-crm-s7-token-hardening` / `work/portal-p2-s7-token-hardening` |
| BASE SHA           | `d98c3e90715e4a7e104285a68ea16cc56811c30b`                                                             |
| S5 SHA             | `d9d8242ad6df0f9e6f58af27baa96bcf16135a3d`                                                             |
| S6 SHA             | `b7f2cc1edadfd4351f70e5b3682ac561751369eb`                                                             |
| S7 SHA             | `630aa7f50a8fa3c8bc868505e6288ede9c6965b4`                                                             |

## Repository isolation

- Original dirty worktree preserved: YES (`christmas-light-crm` untouched)
- S7 clean boundary: YES (dedicated worktree + branch from S6 docs head)
- Unrelated files included: NO
- Post-commit working tree: clean of S7-reviewed files only

## Token inventory

- Collections: `organizations/{orgId}/portalAccounts`, dual-write cleared on `customers.portalToken`
- Plaintext token fields: legacy `accessToken` / `portalToken` (compat read only)
- Hash fields: `accessTokenHash` (`v1:<sha256-hex>`), `accessTokenHashVersion`
- Readers: `resolvePortalMagicAccess` → `requirePortalAccess`
- Writers: `ensurePortalAccount` / `enableCustomerPortal` / `rotatePortalAccessToken` via `portalMagicCredentialWriteFields`
- Rotation / revocation: hash-only write; revoke clears plaintext, keeps hash + `revokedAt`

## Token generation / hashing

- Generator: `generatePortalAccessToken` → `createPortalOpaqueToken` (crypto)
- Raw token persisted: NO for new writes
- New plaintext writes: 0
- Canonical helper: `hashPortalAccessToken` / version `v1` / salt `portal-magic-access-v1`
- Duplicate-hash behavior: DENY (`duplicate_hash_blocked`)

## Compatibility

- Hash lookup: YES
- Legacy plaintext fallback: COMPATIBILITY mode only (centralized)
- Fallback telemetry: `portal.magic_token.legacy_lookup_used`
- Revocation / suspension bypass: NO
- Cross-customer session conflict: HTTP 409 (no silent switch)

## Rotation / revocation

- Hash-only write: YES
- Old token DENY / new PASS: YES (integration)
- Session invalidation: preserved via `sessionVersion`
- Raw token retrievable later from staff DTO: NO (`accessUrl: null`)

## Tokenless routes

- Canonical namespace: `/portal/app/**`
- Session requirement: `__portal_session`
- Raw token accepted on canonical routes as primary auth: NO
- Internal nav tokenless: YES (`portalAppPath`)
- Legacy shims: `/portal/[token]/[[...segments]]` → exchange → `router.replace`

## URL / browser security

- Cache-Control no-store + Referrer-Policy no-referrer on entry (next.config)
- robots noindex on entry + `/portal/app` layouts
- Analytics / Sentry: NOT APPLICABLE (no vendor added)
- localStorage / sessionStorage raw magic token: none (static audit)

## Emulator migration tool

- `scripts/portal-token-migration.mjs` modes: inventory / dry-run / backfill-hashes / verify / remove-plaintext / report
- Production guard: `PRODUCTION_PORTAL_TOKEN_MIGRATION_NOT_AUTHORIZED` (no bypass flags)
- Integration proves hash-only auth, legacy modes, rotate/revoke, duplicate hash, session-only APIs

## Static audits (10)

| Audit                 | Result |
| --------------------- | ------ |
| portal-permissions    | PASS   |
| portal-sessions       | PASS   |
| portal-auth-security  | PASS   |
| portal-query-scope    | PASS   |
| portal-public-dtos    | PASS   |
| portal-routes         | PASS   |
| portal-files          | PASS   |
| portal-mutations      | PASS   |
| portal-idempotency    | PASS   |
| portal-token-security | PASS   |

## Test results

| Gate                                    | Result                                                       |
| --------------------------------------- | ------------------------------------------------------------ |
| Format                                  | PASS                                                         |
| Lint                                    | PASS                                                         |
| Typecheck                               | PASS                                                         |
| Unit                                    | PASS — 213                                                   |
| Integration                             | PASS (includes S7 ×12)                                       |
| Firebase rules                          | PASS — 18/18                                                 |
| E2E                                     | PASS — 68 passed, 13 skipped (P0.2C staging-auth NON_PORTAL) |
| Portal launch-critical skipped          | 0                                                            |
| Token-hardening launch-critical skipped | 0                                                            |
| Build                                   | PASS                                                         |
| production:check ×3                     | PASS / PASS / PASS                                           |

## Defects

- P0: 0
- Token-security P1: 0
- Corrected during S7: `/a` missing TRPCProvider layout (E2E 500); invalid `headers()` export on token layout; format-changed Windows cmdline batching; S5 route auth early-public shim regression

## Deferred (not authorized by S7)

- Production token inventory / backfill / plaintext removal / legacy-fallback disablement
- Firebase rules/index deployment
- Production deployment
- P2-S8

## Production contact

- PRODUCTION FIREBASE READS: 0
- PRODUCTION WRITES: 0
- PRODUCTION TOKEN MIGRATIONS: 0
- DEPLOYMENT PERFORMED: NO
- DEPLOYMENT AUTHORIZED: NO

## Recommendation

**PROCEED TO PORTAL-P2-S8** (do not start automatically).
