# Portal Phase 2 S7 — Token Model

**ENVIRONMENT:** EMULATOR
**Production Firebase / migration:** PROHIBITED

## Credential kinds

| Kind                           | Storage                                               | Lookup                                                 |
| ------------------------------ | ----------------------------------------------------- | ------------------------------------------------------ |
| Magic access                   | `portalAccounts.accessTokenHash` (`v1:<sha256-hex>`)  | `resolvePortalMagicAccess` hash-first                  |
| Legacy plaintext (compat only) | `portalAccounts.accessToken`, `customers.portalToken` | Dual-read when `PORTAL_MAGIC_TOKEN_MODE=COMPATIBILITY` |
| Portal session                 | HMAC cookie `__portal_session`                        | `verifyPortalSessionTokenServer` + live sessionVersion |

## New writes (S7)

- `enableCustomerPortal`, `rotatePortalAccessToken`, `ensurePortalAccount` with new token → **hash-only** via `portalMagicCredentialWriteFields`.
- Raw token returned **once** to staff/delivery path; never rehydrated from Firestore on reads.
- `customers.portalToken` cleared on enable/rotate.

## Resolution order

1. Normalize raw token (16–256 chars).
2. Hash lookup (`collectionGroup portalAccounts` on `accessTokenHash`).
3. Duplicate hash matches → **DENY** (`portal.magic_token.duplicate_hash_blocked`).
4. Lifecycle: suspended / revoked / archived / locked → **DENY** (hash and legacy).
5. If `COMPATIBILITY`: legacy plaintext on account or customer.
6. Stale plaintext when hash exists but mismatches → **DENY**.

## Modes

| `PORTAL_MAGIC_TOKEN_MODE` | Legacy plaintext lookup |
| ------------------------- | ----------------------- |
| `COMPATIBILITY` (default) | Allowed                 |
| `HASH_ONLY`               | Disabled                |

## Staff reads

`getStaffPortalAccountView` returns `credentialFingerprint` (8 hex chars), `credentialExists`, `accessUrl: null` — no raw token or magic URL.

**Gate status:** Implementation in worktree; production PASS not claimed.
