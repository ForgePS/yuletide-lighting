# Portal Phase 2 S7 — Magic Access Token Inventory

**ENVIRONMENT:** EMULATOR
**PHASE:** PORTAL-P2-S7 / Checkpoint **S7A**
**DATE:** 2026-08-02
**STATUS:** S7A implementation inventory (updated after hash cutover foundation)

Related: `portal-phase-2-s7-token-model.md`, `portal-phase-2-s7a-completion.md`.

---

## System differentiation

| System                                       | Storage                                                                                      | Notes                                                |
| -------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| **Magic access**                             | Hash-only for **new** writes: `accessTokenHash`. Legacy plaintext dual-read in COMPATIBILITY | This inventory                                       |
| **Invitation**                               | `invitationTokenHash` via `hashPortalSecret(raw, 'portal-invitation')`                       | Unchanged S3                                         |
| **QR**                                       | `tokenHash` via unsalted SHA-256                                                             | Separate secret; activation may mint magic hash-only |
| **OTP**                                      | `codeHash` via `hashPortalSecret(code, 'portal-otp')`                                        | Unchanged S3                                         |
| **Session**                                  | `__portal_session` cookie                                                                    | Decoupled from magic storage (S7A)                   |
| **Public proposal/invoice/agreement/mockup** | Own `publicToken` fields                                                                     | Out of S7A scope                                     |

---

## 1. Canonical fields (post-S7A)

| Path             | Field                                                    | Role                                                                                        |
| ---------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `portalAccounts` | `accessTokenHash`                                        | **Authoritative** for new credentials (`v1:<hex>`)                                          |
| `portalAccounts` | `accessTokenHashVersion`                                 | Version marker (1)                                                                          |
| `portalAccounts` | `accessToken`                                            | Legacy plaintext; null on new writes; COMPATIBILITY read                                    |
| `customers`      | `portalToken`                                            | Legacy plaintext; **not written** for new credentials; cleared on enable/rotate/QR activate |
| `portalAccounts` | `portalEnabled`, `status`, `sessionVersion`, `revokedAt` | Lifecycle                                                                                   |

Hash domain: `PORTAL_ACCESS_SECRET_DOMAIN = 'portal-magic-access'` via `hashPortalAccessToken`.

---

## 2. Writers / readers (post-S7A)

| Role            | Location                                                                                | Behavior                                         |
| --------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Issue hash-only | `portal360.ts:ensurePortalAccount` / `enableCustomerPortal` / `rotatePortalAccessToken` | `portalMagicCredentialWriteFields`               |
| QR mint magic   | `portal-qr360.ts:verifyPortalQrCodeAndActivate`                                         | Hash-only; `portalToken: null`                   |
| Resolve         | `portal-magic-access.ts:resolvePortalMagicAccess`                                       | Hash-first → legacy fallback                     |
| Gate            | `portal360.ts:requirePortalAccess`                                                      | Delegates to resolver                            |
| Session         | `portal-session.ts` + `resolvePortalAuthorizedContext`                                  | Identity + sessionVersion; **no** magic re-entry |

---

## 3. Routes accepting magic token (entry)

- Legacy: `/portal/[token]/**` (shim → session exchange → `/portal/app/**` where present)
- Login paste → `/portal/{token}`
- `POST /api/portal/session` `{ accessToken }`
- tRPC optional `token` on public procedures

S7B owns full tokenless cutover hardening; S7A closes storage/resolution.

---

## 4. DTO exposure (post-S7A)

| Surface                     | Raw?                                                                   |
| --------------------------- | ---------------------------------------------------------------------- |
| Dashboard                   | **No** (`accessToken` field removed)                                   |
| `getStaffPortalAccountView` | **No** (`accessUrl: null`, sanitized account)                          |
| `getCustomerPortalAccess`   | **No** (`accessUrl: null`)                                             |
| enable / rotate             | **Once** via `token` / `credential` / `accessUrl`; `account` sanitized |

---

## 5. Invitation hashing (reuse pattern)

`hashPortalSecret(raw, 'portal-invitation')` → store hash only → collectionGroup lookup.
Magic uses same primitive with domain `portal-magic-access` (+ `v1:` prefix).

---

## 6. Session establishment

Entry raw magic → `establishPortalSessionFromAccessToken` → `__portal_session`.
Subsequent auth: session payload IDs + `sessionVersion` (no plaintext / hash credential lookup).

---

## 7. S7A touch points (done / residual)

| File                                           | S7A role                                         |
| ---------------------------------------------- | ------------------------------------------------ |
| `packages/firebase/src/portal-magic-access.ts` | Hash, resolve, write fields, telemetry           |
| `packages/firebase/src/portal360.ts`           | Writers, requirePortalAccess, DTOs, session path |
| `packages/firebase/src/portal-session.ts`      | Session mint/verify                              |
| `packages/firebase/src/portal-qr360.ts`        | No plaintext magic dual-write                    |
| `packages/firebase/src/customer360.ts`         | No URL reconstruction                            |
| `apps/web/.../customer-overview.tsx`           | One-time issued link in local state              |
| `scripts/portal-token-migration.mjs`           | Emulator inventory/dry-run/backfill/verify       |
| `scripts/audit-portal-token-security.mjs`      | Static regression audit                          |
| `firestore.indexes.json`                       | `accessTokenHash` collection-group index         |

**S7B (not S7A):** final plaintext removal, referrer/analytics hardening, mass route shim retirement.
