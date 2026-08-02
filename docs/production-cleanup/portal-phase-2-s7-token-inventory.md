# Portal Phase 2 S7 — Magic Access Token Inventory

**ENVIRONMENT:** EMULATOR
**PHASE:** PORTAL-P2-S7 Legacy Magic-Token Hardening
**DATE:** 2026-08-02
**BASE SHA:** `d98c3e90715e4a7e104285a68ea16cc56811c30b`
**SCOPE:** Magic access tokens only (`portalAccounts.accessToken` / `customers.portalToken`). Not proposal/agreement/invoice/mockup `publicToken` flows unless they share code paths.

Production Firebase reads/writes and deploys: **PROHIBITED**.

---

## System differentiation (do not conflate)

| System                                             | Raw secret location                            | At-rest storage today                                                                          | URL / entry                        | Lookup                                                       |
| -------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------ |
| **Magic access** (this inventory)                  | Issued as `nanoid(32)`; dual-written plaintext | `portalAccounts.accessToken` + `customers.portalToken`                                         | `/portal/{token}`                  | Equality on plaintext fields                                 |
| **Invitation**                                     | One-time opaque token                          | `portalUsers.invitationTokenHash` only (`hashPortalSecret(raw, 'portal-invitation')`)          | `/portal/invite/{invitationToken}` | collectionGroup on `invitationTokenHash`                     |
| **QR**                                             | One-time / reusable opaque                     | `portalQrCodes.tokenHash` (`hashPortalQrToken` = unsalted SHA-256); legacy `token` cleared     | `/portal/access/{rawToken}`        | Hash first, legacy plaintext fallback                        |
| **OTP**                                            | 6-digit code                                   | OTP doc `codeHash` via `hashPortalSecret(code, 'portal-otp')`                                  | Used after QR scan (verify flow)   | Hash compare                                                 |
| **Portal session**                                 | Signed cookie payload                          | Cookie `__portal_session` (HMAC via `hashPortalSecret(body, secret)`); not stored in Firestore | Cookie on `/`                      | `verifyPortalSessionToken` + live account/user version check |
| **Public proposal / agreement / invoice / mockup** | Separate `publicToken` / `approvalToken`       | Own collections                                                                                | `/p/...`, `/pay/...`, etc.         | Separate routers; not magic access                           |

`accessTokenHash` exists on `PortalAccount` type and is cleared to `null` on rotate, but **no writer currently persists a hash value** and **no reader verifies via hash**.

---

## 1. Canonical collection / fields (magic access)

### Canonical account document

Path: `organizations/{orgId}/portalAccounts/{portalAccountId}`

| Field                                       | Role                                                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `accessToken`                               | **Canonical plaintext magic token** (lookup key today)                                     |
| `accessTokenHash`                           | Typed optional field; cleared on rotate; **unused for verify**                             |
| `customerId`                                | Owning customer                                                                            |
| `organizationId`                            | Tenant (also inferred from path)                                                           |
| `portalEnabled`                             | Gate for access                                                                            |
| `status`                                    | `not_invited` \| `invitation_pending` \| `active` \| `locked` \| `suspended` \| `archived` |
| `primaryPortalUserId`                       | Used when establishing session from magic token                                            |
| `sessionVersion`                            | Bumped to invalidate `__portal_session` cookies                                            |
| `revokedAt` / `revokedBy`                   | Set by revoke                                                                              |
| `suspendedAt` / `suspendedBy`               | Set by suspend                                                                             |
| `invitedAt` / `activatedAt` / `lastLoginAt` | Lifecycle timestamps                                                                       |

Type: `packages/types/src/portal.ts` → `PortalAccount`.

### Legacy dual-write customer fields

Path: `organizations/{orgId}/customers/{customerId}`

| Field                | Role                                                         |
| -------------------- | ------------------------------------------------------------ |
| `portalToken`        | Legacy plaintext dual-write of the same magic token          |
| `portalEnabled`      | Legacy enable flag (also required for customer-token lookup) |
| `portalInviteSentAt` | Invite/enable timestamp                                      |
| `portalLastLoginAt`  | Last portal login                                            |

Type: `packages/firebase/src/firestore.ts` → `CustomerRecord`.

### Indexes (collection group)

`firestore.indexes.json` fieldOverrides:

- `customers.portalToken` — COLLECTION + COLLECTION_GROUP ASC
- `portalAccounts.accessToken` — COLLECTION + COLLECTION_GROUP ASC

(Invitation uses `portalUsers.invitationTokenHash`; QR uses `portalQrCodes.tokenHash` — separate systems.)

### URL builder

- `packages/firebase/src/portal360.ts` → `portalAccessUrl` / `buildPortalAccessUrl`
  → `{NEXT_PUBLIC_APP_URL}/portal/{token}`

---

## 2. Generators / writers / readers / rotators / revokers

Paths relative to repo root. Format: `file:function`.

### Generators / writers (create or persist plaintext)

| Function                                                                                          | What it writes                                                                                                                                          |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/firebase/src/portal360.ts:ensurePortalAccount`                                          | Creates/updates `portalAccounts.accessToken`; dual-writes `customers.portalToken`; generates via `opts.token ?? customer.portalToken ?? nanoid(32)`     |
| `packages/firebase/src/portal360.ts:ensureCustomerPortalToken`                                    | Wrapper → returns `ensurePortalAccount(...).token`                                                                                                      |
| `packages/firebase/src/portal360.ts:enableCustomerPortal`                                         | Ensures account; sets customer `portalEnabled`/`portalToken`/`portalInviteSentAt`; sets account `accessToken`/`portalEnabled`/`status:'active'`         |
| `packages/firebase/src/portal360.ts:rotatePortalAccessToken`                                      | New `nanoid(32)`; dual-writes customer + account; sets `accessTokenHash: null`; invalidates sessions                                                    |
| `packages/firebase/src/portal360.ts:sendPortalInviteEmail`                                        | Calls `enableCustomerPortal` then emails `accessUrl` (raw token in link)                                                                                |
| `packages/firebase/src/portal360.ts:backfillPortalAccountsForOrg`                                 | Creates accounts from existing `customers.portalToken` / `portalEnabled`                                                                                |
| `packages/firebase/src/portal360.ts:getStaffPortalAccountView`                                    | May call `ensurePortalAccount` (side-effect writer) if legacy customer has token/enabled but no account                                                 |
| `packages/firebase/src/portal-qr360.ts:verifyPortalQrCodeAndActivate` (and related activate path) | Calls `ensurePortalAccount` with `portalEnabled: true`; dual-writes `customers.portalToken` to the **magic** access token (QR raw token stays separate) |
| `packages/firebase/src/portal-invitation.ts:createPortalUserInvitation`                           | Calls `ensurePortalAccount` (may mint magic token as side effect); invitation secret itself is hashed, not magic                                        |
| `scripts/seed-staging-verification.ts`                                                            | Seeds via `ensurePortalAccount` (emulator/staging seed tooling)                                                                                         |

### Readers / resolvers (accept raw magic token)

| Function                                                                                                               | Behavior                                                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `packages/firebase/src/portal360.ts:findAccountByAccessToken`                                                          | `collectionGroup('portalAccounts').where('accessToken','==',token)`                                                         |
| `packages/firebase/src/portal360.ts:findCustomerByPortalToken`                                                         | `collectionGroup('customers').where('portalToken','==',token)` + requires `portalEnabled`                                   |
| `packages/firebase/src/portal360.ts:requirePortalAccess`                                                               | Dual-read account then customer; returns `PortalAccessContext` including `accessToken`                                      |
| `packages/firebase/src/portal360.ts:getCustomerByPortalToken`                                                          | Deprecated wrapper over `requirePortalAccess`                                                                               |
| `packages/firebase/src/portal360.ts:asPortalAuth`                                                                      | Normalizes `string \| { token?, sessionToken? }`                                                                            |
| `packages/firebase/src/portal360.ts:resolvePortalAuthorizedContext`                                                    | Magic token first via `requirePortalAccess`; else session; session path re-calls `requirePortalAccess(account.accessToken)` |
| `packages/firebase/src/portal360.ts:requirePortalAuthorized`                                                           | Authz gate using above + role/feature/action                                                                                |
| `packages/firebase/src/portal-route-access.ts:requirePortalRouteAccess` / `authorizePortalPath`                        | Route matrix over `requirePortalAuthorized`                                                                                 |
| `packages/firebase/src/portal-session.ts:establishPortalSessionFromAccessToken`                                        | Magic → `requirePortalAccess` → `createPortalSessionContext` using `primaryPortalUserId`                                    |
| All `packages/firebase/src/portal360.ts` public feature helpers (`getPortalDashboard`, `listPortal*`, mutations, etc.) | Accept `string \| PortalAuthInput` via `asPortalAuth` / `requirePortalAuthorized`                                           |

### Rotators

| Function                                                     | Notes                                                      |
| ------------------------------------------------------------ | ---------------------------------------------------------- |
| `packages/firebase/src/portal360.ts:rotatePortalAccessToken` | Canonical rotator; returns `{ token, accessUrl, account }` |
| `packages/api/src/routers/portal360.ts` → `rotateToken`      | Staff tRPC wrapper                                         |

### Revokers / disablers (do not clear token plaintext today)

| Function                                                                                  | Effect on magic token / access                                                                                                                     |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/firebase/src/portal360.ts:revokeCustomerPortal`                                 | `portalEnabled:false`, account `status:'archived'`, `revokedAt`/`revokedBy`; **does not null `accessToken`/`portalToken`**; bumps `sessionVersion` |
| `packages/firebase/src/portal360.ts:suspendCustomerPortal`                                | Account suspended + disabled; customer `portalEnabled:false`; sessions invalidated; **token fields retained**                                      |
| `packages/firebase/src/portal360.ts:logoutAllPortalSessions` / `invalidatePortalSessions` | Session invalidation only                                                                                                                          |
| `packages/api/src/routers/portal360.ts` → `revoke` / `suspend` / `logoutAllSessions`      | Staff wrappers                                                                                                                                     |

### Staff / customer DTO helpers that surface the link

| Function                                                       | Exposure                                              |
| -------------------------------------------------------------- | ----------------------------------------------------- |
| `packages/firebase/src/portal360.ts:getStaffPortalAccountView` | `accessUrl` / `accessLinkPlaceholder` embed raw token |
| `packages/firebase/src/customer360.ts:getCustomerPortalAccess` | Builds `accessUrl` from `customer.portalToken`        |
| `packages/firebase/src/portal360.ts:getPortalDashboard`        | Returns `accessToken` in public dashboard DTO         |

---

## 3. URL routes that accept magic token

### App routes (`apps/web/src/app/portal/[token]/...`)

Magic token is the dynamic `[token]` segment (not QR, not invite):

| Route                              | File                                       |
| ---------------------------------- | ------------------------------------------ |
| `/portal/[token]`                  | `apps/web/src/app/portal/[token]/page.tsx` |
| `/portal/[token]/schedule`         | `.../schedule/page.tsx`                    |
| `/portal/[token]/schedule-request` | `.../schedule-request/page.tsx`            |
| `/portal/[token]/service-request`  | `.../service-request/page.tsx`             |
| `/portal/[token]/messages`         | `.../messages/page.tsx`                    |
| `/portal/[token]/notifications`    | `.../notifications/page.tsx`               |
| `/portal/[token]/contacts`         | `.../contacts/page.tsx`                    |
| `/portal/[token]/sign`             | `.../sign/page.tsx`                        |
| `/portal/[token]/billing`          | `.../billing/page.tsx`                     |
| `/portal/[token]/proposals`        | `.../proposals/page.tsx`                   |
| `/portal/[token]/agreements`       | `.../agreements/page.tsx`                  |
| `/portal/[token]/properties`       | `.../properties/page.tsx`                  |
| `/portal/[token]/mockups`          | `.../mockups/page.tsx`                     |
| `/portal/[token]/documents`        | `.../documents/page.tsx`                   |
| `/portal/[token]/jobs`             | `.../jobs/page.tsx`                        |
| `/portal/[token]/jobs/[jobId]`     | `.../jobs/[jobId]/page.tsx`                |
| `/portal/[token]/consultations`    | `.../consultations/page.tsx`               |
| `/portal/[token]/takedowns`        | `.../takedowns/page.tsx`                   |
| `/portal/[token]/storage`          | `.../storage/page.tsx`                     |
| `/portal/[token]/reviews`          | `.../reviews/page.tsx`                     |
| `/portal/[token]/rebook`           | `.../rebook/page.tsx`                      |

Route auth matrix: `packages/firebase/src/portal-route-access.ts` → `PORTAL_ROUTE_DEFINITIONS` (suffix after `/portal/[token]`).

### Related but **not** magic-access URLs

| Route                                      | System                                                           |
| ------------------------------------------ | ---------------------------------------------------------------- |
| `/portal/access/[token]`                   | QR raw token (`apps/web/src/app/portal/access/[token]/page.tsx`) |
| `/portal/invite/[token]`                   | Invitation token                                                 |
| `/portal/login`                            | Session/login entry (no magic segment)                           |
| `/p/...`, `/pay/...`, mockup approval URLs | Public record tokens                                             |

### API / tRPC surfaces that accept magic token

| Surface                            | Input field                                                                | File                                                                     |
| ---------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `POST /api/portal/session`         | body `accessToken`                                                         | `apps/web/src/app/api/portal/session/route.ts`                           |
| `POST /api/portal/authorize-route` | body `token` (+ cookie session)                                            | `apps/web/src/app/api/portal/authorize-route/route.ts`                   |
| `portal360.auth.establishSession`  | `accessToken`                                                              | `packages/api/src/routers/portal360.ts`                                  |
| `portal360.auth.authorizeRoute`    | `token` optional                                                           | same                                                                     |
| `portal360.public.*`               | `token` optional via `portalTokenInputSchema` (+ `ctx.portalSessionToken`) | same                                                                     |
| Client cookie establish            | `accessToken` → `/api/portal/session`                                      | `apps/web/src/lib/portal-session-client.ts:establishPortalSessionCookie` |
| Shell auto-establish               | URL/`dashboard.accessToken`                                                | `apps/web/src/components/portal/portal-shell.tsx`                        |

---

## 4. DTO exposure of raw magic token today

| Surface                                                   | Exposed form                                   | Notes                                                              |
| --------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------ |
| `enableCustomerPortal` return                             | `{ token, accessUrl, account }`                | `account` is full `PortalAccount` including `accessToken`          |
| `rotatePortalAccessToken` return                          | `{ token, accessUrl, account }`                | Same                                                               |
| tRPC `portal360.enable` / `rotateToken`                   | Pass-through of above                          | Staff office procedures                                            |
| tRPC `portal360.invite` → `sendPortalInviteEmail`         | `{ sent, accessUrl, email, reason? }`          | Raw token inside `accessUrl`                                       |
| tRPC `portal360.getAccount` → `getStaffPortalAccountView` | `accessUrl`, `accessLinkPlaceholder`           | Embeds `/portal/{raw}`                                             |
| `getCustomerPortalAccess`                                 | `accessUrl` from `customers.portalToken`       | Used by customer overview UI                                       |
| `getPortalDashboard` / `PortalDashboardPublic`            | **`accessToken: string`**                      | Echoed to browser; pages prefer `data.accessToken \|\| urlToken`   |
| Staff UI                                                  | Copies/displays `accessUrl`                    | `apps/web/src/components/customers/customer-overview.tsx`          |
| Email invite body                                         | Full `accessUrl`                               | Resend text email in `sendPortalInviteEmail`                       |
| QR activate response                                      | `portalUrl: buildPortalAccessUrl(accessToken)` | Magic URL after OTP verify (`portal-qr360`) — not the QR raw token |

**Intentionally not exposed in public customer DTO:**

- `toPublicCustomer` / `PortalCustomerPublic` strip `portalToken` (tests assert absence).
- Dashboard `customer` object is public shape only; raw token is a **sibling** field `accessToken`, not under `customer`.

**Invitation contrast:** staff invite responses return raw `invitationToken` only when delivery channel is emulator; Firestore stores hash only.

---

## 5. Invitation hashing (reuse pattern for S7)

Source of truth: `packages/firebase/src/portal-invitation.ts` + `packages/firebase/src/portal-security.ts`.

| Step                      | Implementation                                                                  |
| ------------------------- | ------------------------------------------------------------------------------- |
| Generate                  | `createPortalOpaqueToken(32)` → base64url                                       |
| Hash                      | `hashPortalSecret(invitationToken, 'portal-invitation')`                        |
| Algorithm                 | `sha256(`${salt}:${value}`)` hex (`hashPortalSecret`)                           |
| Persist                   | `portalUsers.invitationTokenHash` only; never store raw                         |
| Lookup                    | `collectionGroup('portalUsers').where('invitationTokenHash','==',tokenHash)`    |
| Claim                     | Transaction; on success set `invitationTokenHash: null`, status consumed        |
| Revoke / replace / expire | Clear `invitationTokenHash` to `null`                                           |
| Delivery                  | Raw token only in email / emulator capture; claim path `/portal/invite/{token}` |

**Recommended reuse for magic access (S7):** same `hashPortalSecret(raw, '<purpose-salt>')` with a **distinct salt** (e.g. `'portal-access'` — name TBD in implementation; do not reuse `'portal-invitation'` or `'portal-otp'`). Prefer invitation’s dual-read evolution pattern + QR’s “hash first, legacy plaintext fallback, then clear plaintext” rather than QR’s unsalted `hashPortalQrToken`.

Note: QR uses a different hash (`createHash('sha256').update(rawToken)` with **no** salt prefix). Do not mix algorithms across systems without an explicit migration.

---

## 6. Current `__portal_session` establishment path

Cookie name: `PORTAL_SESSION_COOKIE` = `'__portal_session'` (`packages/firebase/src/portal-security.ts`).

### Mint

1. `createPortalSessionContext` (`packages/firebase/src/portal-session.ts`)
   - Loads account + user; checks enabled/not suspended/locked/revoked
   - `sessionVersion = max(account.sessionVersion, user.sessionVersion)`
   - Signs payload with `signPortalSessionToken` (body + `hashPortalSecret(body, secret)`)
   - Secret: `PORTAL_SESSION_SECRET` \|\| `NEXTAUTH_SECRET` \|\| `SESSION_SECRET` \|\| emulator default
   - TTL: `PORTAL_SESSION_TTL_MS` = 12h

### Magic-token → session (compatibility)

1. Client on `/portal/[token]/*` loads dashboard with `{ token }`
2. `portal-shell` calls `establishPortalSessionCookie(accessToken)`
3. `POST /api/portal/session` with `{ accessToken }`
4. Server: `establishPortalSessionFromAccessToken` → `requirePortalAccess` → requires `account.primaryPortalUserId` → `createPortalSessionContext`
5. Sets httpOnly `__portal_session` cookie

Alternate mint paths (not magic writers, but set same cookie):

- Invitation claim: `portal360.auth.claimInvitation` → `createPortalSessionContext` → client can POST `{ sessionToken }` to `/api/portal/session`
- QR verify: extracts magic segment from `portalUrl`, then `establishPortalSessionCookie`
- tRPC `portal360.auth.establishSession` returns `sessionToken` (cookie still via REST)

### Consume

- Next.js / tRPC context supplies `portalSessionToken` from cookie (`packages/api/src/trpc.ts`)
- `resolvePortalAuthorizedContext`: if magic `token` fails/absent, `verifyPortalSessionTokenServer(sessionToken)`
- Session verify re-checks account/user + `sessionVersion`; then re-hydrates via `requirePortalAccess(account.accessToken)` (**still depends on plaintext `accessToken` on the account**)

### Invalidate

`invalidatePortalSessions` bumps `portalAccounts.sessionVersion` and per-user `sessionVersion` (revoke, suspend, rotate, logout-all, role change, invitation revoke).

---

## 7. Recommended S7 touch points

Ordered by dependency. EMULATOR-only until separately authorized.

### Core crypto / storage

1. `packages/firebase/src/portal-security.ts` — purpose salt helper / document salt constant for access tokens
2. `packages/types/src/portal.ts` — confirm/extend `accessTokenHash` (and any version field if added)
3. `packages/firebase/src/portal360.ts`
   - `ensurePortalAccount` / `enableCustomerPortal` / `rotatePortalAccessToken` — write hash; stop dual-writing plaintext when cutover allows
   - `findAccountByAccessToken` / `findCustomerByPortalToken` / `requirePortalAccess` — hash-first dual-read
   - `revokeCustomerPortal` / `suspendCustomerPortal` — clear or rotate secrets on revoke
   - `getStaffPortalAccountView` / `sendPortalInviteEmail` / `getPortalDashboard` — stop returning durable raw token (issue-once on enable/rotate only)
   - `resolvePortalAuthorizedContext` session branch — stop requiring plaintext `account.accessToken` re-lookup
4. `packages/firebase/src/customer360.ts:getCustomerPortalAccess` — stop embedding raw `portalToken` in `accessUrl` after cutover
5. `firestore.indexes.json` — add `accessTokenHash` collectionGroup index; plan removal of plaintext indexes after zero usage

### Session-first URL cutover

6. `packages/firebase/src/portal-session.ts:establishPortalSessionFromAccessToken` — entry for one-time exchange
7. `apps/web/src/app/api/portal/session/route.ts` — exchange endpoint (already exists; harden response/logging)
8. `apps/web/src/lib/portal-session-client.ts` — client exchange helper
9. `apps/web/src/components/portal/portal-shell.tsx` — establish session then prefer cookie; reduce token in navigations
10. `apps/web/src/app/portal/[token]/**` — session-first navigation / redirect strategy (compat window for old links)
11. `packages/validators/src/portal360.ts` — `portalEstablishSessionSchema` / `portalTokenInputSchema` evolution
12. `packages/api/src/routers/portal360.ts` — `auth.establishSession`, staff `enable`/`rotateToken`/`getAccount`/`invite` response shapes; public procedures session-primary

### Adjacent systems that mint/consume magic URLs

13. `packages/firebase/src/portal-qr360.ts` — activate path dual-writes `customers.portalToken` and returns `buildPortalAccessUrl(accessToken)`
14. `apps/web/src/app/portal/access/[token]/page.tsx` — parses magic token from `portalUrl` after OTP
15. `apps/web/src/components/customers/customer-overview.tsx` — staff copy/rotate UX for access links

### Tests / evidence (emulator)

16. `tests/integration/portal/portal-phase2*.integration.test.ts`
17. `packages/firebase/src/portal-phase2*.test.ts`
18. `e2e/portal-phase2*.spec.ts`
19. Docs: this inventory + `docs/production-cleanup/portal-token-hardening-plan.md` + S7 evidence/completion artifacts

### Explicit non-goals / do not change in S7 without separate approval

- Proposal/agreement/invoice/mockup `publicToken` persistence and public routes
- Invitation / QR / OTP hash algorithms (reuse pattern only; keep purpose salts separate)
- Production backfill or production token rotation
- Deploy / production Firebase writes

---

## Quick reference — magic token lifecycle today

```text
enable / ensure / rotate
  → nanoid(32) plaintext
  → portalAccounts.accessToken  +  customers.portalToken
  → URL /portal/{token}
  → requirePortalAccess (equality dual-read)
  → optional establishPortalSessionFromAccessToken
  → __portal_session cookie
  → subsequent APIs: token and/or sessionToken

revoke / suspend
  → disable flags + sessionVersion bump
  → plaintext tokens remain in Firestore
```

---

## Inventory completeness notes

- Field names above are taken from types and writers; none invented.
- `accessTokenHash` is typed and null-cleared but **not** yet a live verification path — S7 implements that.
- QR `accessUrl` under `/portal/access/...` is a **different** secret; magic hardening must not break QR hash-only storage.
- Session establishment from magic token currently requires `primaryPortalUserId`; accounts without a primary user cannot mint `__portal_session` via the compatibility path.
