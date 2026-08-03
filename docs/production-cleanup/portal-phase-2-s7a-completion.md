# CHECKPOINT: PORTAL-P2-S7A

**STATUS:** COMPLETE (EMULATOR)  
**DATE:** 2026-08-02  
**BRANCH/WORKTREE:** `work/portal-p2-s7-token-hardening` / `C:\Users\jerem\Projects\christmas-light-crm-s7-token-hardening`  
**BASE SHA:** `d98c3e90715e4a7e104285a68ea16cc56811c30b`  
**S7A SHA:** worktree (S7A corrections on top of prior S7 commits; commit when authorized)  
**ENVIRONMENT:** EMULATOR  

## HASH MODEL

- Canonical helper: `packages/firebase/src/portal-magic-access.ts:hashPortalAccessToken`
- Secret domain: `PORTAL_ACCESS_SECRET_DOMAIN = "portal-magic-access"` (≠ `portal-invitation` / `portal-otp`)
- Stored format: `v1:<sha256-hex>`
- `accessTokenHash` authoritative for new credentials: **YES**
- New plaintext `accessToken` writes: **0** (writers set `null`)
- New `customers.portalToken` writes: **0** (cleared to `null` on enable/rotate/QR activate)

## WRITERS

- `ensurePortalAccount`: hash-only when issuing; Pattern A returns one-time `token` when newly issued
- `enableCustomerPortal`: hash-only + `{ token, accessUrl, credential, account: SanitizedPortalAccountDto }`
- `rotatePortalAccessToken`: hash-only; never nulls `accessTokenHash`; invalidates sessions
- QR bridge (`verifyPortalQrCodeAndActivate`): mints hash-only magic credential; `portalToken: null`

## RESOLVER

- Hash lookup: primary via `resolvePortalMagicAccess` / `resolvePortalAccessCredential`
- `portalAccounts.accessToken` fallback: COMPATIBILITY only
- `customers.portalToken` fallback: COMPATIBILITY only after account plaintext miss; requires canonical portal account
- Duplicate hash behavior: **DENY** (`portal.magic_token.duplicate_hash_blocked`)
- Conflicting legacy behavior: **DENY**
- Legacy telemetry: `portal.magic_token.legacy_lookup_used` only when hash miss + plaintext success
- Login writes: **none** (upgrade-on-read disabled)

## SESSION DECOUPLING

- Session requires `account.accessToken`: **NO**
- Session requires `customer.portalToken`: **NO**
- Session requires `accessTokenHash` lookup: **NO**
- Session account resolution: `getPortalAccount(orgId, portalAccountId)` + user + `sessionVersion`
- `sessionVersion` enforcement: preserved (rotate/revoke invalidate)

## ROTATION

- Old token: **DENY**
- New token: **PASS** (one-time return)
- Stored plaintext: **null**
- Hash stored: **YES**
- Session invalidation: **YES**

## REVOCATION

- Hash path: **DENY**
- Portal account plaintext fallback: **DENY** (lifecycle)
- Customer plaintext fallback: **DENY** (lifecycle + cleared)
- Session invalidation: **YES**
- Bypass findings: **0**

## DTO / UI

- Dashboard `accessToken`: **REMOVED**
- `getAccount` raw token: **NO** (`accessUrl: null`, sanitized account)
- `getCustomerPortalAccess` raw URL: **NO** (`accessUrl: null`)
- `accessTokenHash` exposed on normal DTOs: **NO** (fingerprint only on staff view)
- Enable one-time credential: **YES**
- Rotate one-time credential: **YES**
- Staff can retrieve old raw credential later: **NO** (overview holds issued link in component state only)

## MIGRATION

- Tool: `scripts/portal-token-migration.mjs` (inventory / dry-run / backfill-hashes / verify / …)
- Domain string aligned to `portal-magic-access`
- Production guard: `PRODUCTION_PORTAL_TOKEN_MIGRATION_NOT_AUTHORIZED` (no `--force-production`)
- Inventory / dry-run / backfill / verify: foundation present; run against synthetic emulator data as needed
- Duplicate/conflict: fail closed in resolver + verify mode design

## QR

- Legacy QR token hashing unchanged (separate unsalted domain)
- New magic credential from OTP activation: hash-only
- New plaintext magic dual-write: **0**
- Activation terminal / reusable status: preserved (S6)

## STATIC AUDITS

| Audit | Result |
| --- | --- |
| portal-permissions | PASS |
| portal-sessions | PASS |
| portal-auth-security | PASS |
| portal-query-scope | PASS |
| portal-public-dtos | PASS |
| portal-routes | PASS |
| portal-files | PASS |
| portal-mutations | PASS |
| portal-idempotency | PASS |
| portal-token-security | PASS |

## TESTS

| Gate | Result |
| --- | --- |
| Format | PASS |
| Lint | PASS |
| Typecheck | PASS |
| Unit | PASS — 214 |
| Integration | PASS (S7 suite 15 including S7A cases) |
| Firebase rules | PASS — 18 |
| Build | PASS |
| production:check (audits) | PASS |

## DEFECTS

- P0: **0**
- P1 (S7A token-security): **0**
- P2: worktree dirty with unrelated prior churn — isolate before merge; `@clcrm/types` npm resolution may point at sibling worktree (monitor)

## PRODUCTION FIREBASE READS

**0**

## PRODUCTION WRITES

**0**

## PRODUCTION TOKEN MIGRATIONS

**0**

## DEPLOYMENT

**NO**

## RECOMMENDATION

**PROCEED TO PORTAL-P2-S7B**

S7A closes credential storage/resolution, session decoupling, DTO leaks, QR plaintext magic writes, migration tooling foundation, and the 10th portal security audit. Do **not** mark full P2-S7 complete until S7B tokenless/history/plaintext-removal gates pass.
