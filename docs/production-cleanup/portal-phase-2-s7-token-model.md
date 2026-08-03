# Portal Phase 2 S7 — Token Model

**ENVIRONMENT:** EMULATOR  
**Checkpoint:** PORTAL-P2-S7A  
**Production Firebase / migration:** PROHIBITED

## Credential kinds

| Kind                           | Storage                                               | Lookup                                                                         |
| ------------------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| Magic access (new)             | `portalAccounts.accessTokenHash` (`v1:<sha256-hex>`)  | `resolvePortalMagicAccess` / `resolvePortalAccessCredential` hash-first        |
| Legacy plaintext (compat only) | `portalAccounts.accessToken`, `customers.portalToken` | Dual-read when `PORTAL_MAGIC_TOKEN_MODE=COMPATIBILITY`                         |
| Portal session                 | HMAC cookie `__portal_session`                        | `verifyPortalSessionTokenServer` + live `sessionVersion` (no magic credential) |
| Invitation                     | `portalUsers.invitationTokenHash`                     | Separate domain `portal-invitation`                                            |
| QR access                      | `portalQrCodes.tokenHash`                             | Unsalted SHA-256 of QR raw (not magic-access domain)                           |
| OTP                            | verification `codeHash`                               | Domain `portal-otp`                                                            |

## Hashing

```ts
PORTAL_ACCESS_SECRET_DOMAIN = 'portal-magic-access';
hashPortalAccessToken(raw) = `v1:` + hashPortalSecret(raw, PORTAL_ACCESS_SECRET_DOMAIN);
```

- Single canonical helper: `packages/firebase/src/portal-magic-access.ts:hashPortalAccessToken`
- Domain-separated from invitations (`portal-invitation`) and OTP (`portal-otp`)
- Server-only; raw never logged or persisted for new credentials

## New writes (S7A)

- `enableCustomerPortal`, `rotatePortalAccessToken`, `ensurePortalAccount` (when issuing) → **hash-only** via `portalMagicCredentialWriteFields`
- `accessToken = null`, `customers.portalToken` not written with new raw (cleared to `null`)
- Raw token returned **once** in enable/rotate `{ token, accessUrl, credential, account: SanitizedPortalAccountDto }`
- QR OTP activation mints hash-only magic credential for redirect; does **not** dual-write plaintext

## Resolution order

1. Normalize raw token (16–256 chars)
2. Hash lookup (`collectionGroup portalAccounts` on `accessTokenHash`)
3. Duplicate hash matches → **DENY**
4. Lifecycle: suspended / revoked / archived / locked → **DENY**
5. If `COMPATIBILITY`: legacy `portalAccounts.accessToken`, then `customers.portalToken` → canonical portal account
6. Ambiguous / conflicting matches → **DENY**
7. Login path is **read-only** (no upgrade-on-read writes)

## Modes

| `PORTAL_MAGIC_TOKEN_MODE`              | Legacy plaintext lookup |
| -------------------------------------- | ----------------------- |
| `COMPATIBILITY` (S7A emulator default) | Allowed                 |
| `HASH_ONLY`                            | Disabled                |

## Session decoupling (S7A critical)

Once `__portal_session` exists, authorization loads portal account by trusted `portalAccountId` + `sessionVersion`. It does **not** require `accessToken`, `accessTokenHash`, or `customers.portalToken`.

## Staff / public DTO rules

| Surface                     | Raw token | Hash                | Magic URL         |
| --------------------------- | --------- | ------------------- | ----------------- |
| Dashboard                   | absent    | absent              | absent            |
| `getStaffPortalAccountView` | absent    | fingerprint only    | `accessUrl: null` |
| `getCustomerPortalAccess`   | absent    | n/a                 | `accessUrl: null` |
| enable / rotate response    | once      | absent on `account` | once              |

**Product rule:** After issuance response ends, raw magic token is not recoverable from the database. Staff must rotate to get a new link.
