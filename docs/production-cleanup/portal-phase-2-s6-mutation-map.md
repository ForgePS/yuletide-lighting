# Portal Phase 2 S6 — Customer portal mutation map

**ENVIRONMENT:** EMULATOR  
**Checkpoint:** PORTAL-P2-S6 (transaction integrity)  
**S5 checkpoint SHA:** `d9d8242ad6df0f9e6f58af27baa96bcf16135a3d`  
**Scope:** `portal360.public` + `portal360.auth` mutations, plus REST `/api/portal/*` routes that mutate.  
**Sources of truth:** `packages/api/src/routers/portal360.ts`, `packages/firebase/src/portal360.ts`, `portal-mutation.ts`, `portal-qr360.ts`, `portal-invitation.ts`, `portal-session.ts`, `rebooking360.ts`, `messages360.ts`, `apps/web/src/app/api/portal/*`, `apps/web/src/app/api/stripe/checkout/route.ts`.

## S6 remediation status (post-implementation)

| Pre-S6 classification      | Mutation / area           | S6 remediation                                                                                                             |
| -------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `BLOCKER`                  | `submitRebook`            | Terminal replay in `processRebookRecord`; idempotency via `withPortalIdempotency` (`rebooking.request`)                    |
| `BLOCKER`                  | `qrVerify` / QR OTP       | `used_for_activation` added to `isInactiveStatus` — terminal after single-use activation                                   |
| `NEEDS_IDEMPOTENCY`        | `sendMessage`             | `withPortalIdempotency` (`messaging.send`); rate limit 30/15min inside execute                                             |
| `NEEDS_IDEMPOTENCY`        | `submitServiceRequest`    | `withPortalIdempotency` (`service_request.create`)                                                                         |
| `NEEDS_IDEMPOTENCY`        | `submitScheduleRequest`   | `withPortalIdempotency` (`scheduling.request`)                                                                             |
| `NEEDS_PROVIDER_HARDENING` | Checkout / invoice pay    | `portalInvoicePayableCents` + `portalPaymentSafeMode`; checkout ignores client `amountCents`                               |
| Public-token (out-of-band) | Proposal/agreement/mockup | `canPortalTransition` + state replay in `recordPublicApproval`, `recordAgreementSignature`, `recordCustomerMockupApproval` |
| `NEEDS_IDEMPOTENCY`        | `establishSession`        | **Deferred** — session mint storm low impact                                                                               |
| `NEEDS_IDEMPOTENCY`        | `uploadServicePhoto`      | **Deferred** — orphan upload risk accepted for S6                                                                          |

Static verification: `npm run audit:portal-mutations`, `npm run audit:portal-idempotency`.

---

**Out of scope (not portal mutations):** office/admin `portal360` staff procedures; GET `/api/portal/files`; POST `/api/portal/authorize-route` (auth check only, no write); public-token flows (`/p`, `/a`, `/m`, `/pay`) — linked from portal but hardened separately in S6.

**Unsupported / not present as portal mutations (do not invent):** proposal accept/sign, agreement sign, mockup approve, invoice pay, review submit, contact edit, referral redeem via `portal360.public`. Portal UI lists/links only; signing/payment use separate public tokens or checkout route.

**Classification legend**

| Tag                        | Meaning                                                       |
| -------------------------- | ------------------------------------------------------------- |
| `SAFE`                     | Authz + ownership adequate for S6 baseline; residual risk low |
| `NEEDS_IDEMPOTENCY`        | Repeat submit creates duplicate side effects                  |
| `NEEDS_STATE_GUARD`        | Missing/weak current-state precondition before transition     |
| `NEEDS_CONCURRENCY_GUARD`  | No transactional/optimistic lock under concurrent callers     |
| `NEEDS_AUDIT_HARDENING`    | Weak/missing durable audit of who/what/when                   |
| `NEEDS_PROVIDER_HARDENING` | External provider call needs fail-closed / env gating         |
| `BLOCKER`                  | Must remediate before production portal launch                |

Primary classification is listed first when multiple apply.

---

## Inventory summary

| Surface                           | Count                                                         |
| --------------------------------- | ------------------------------------------------------------- |
| tRPC `portal360.auth` mutations   | 2                                                             |
| tRPC `portal360.public` mutations | 9                                                             |
| REST portal mutating APIs         | 3 (`POST claim-invitation`, `POST session`, `DELETE session`) |
| **Total mutating surfaces**       | **14**                                                        |

| Classification (primary)                                   | Count                                         |
| ---------------------------------------------------------- | --------------------------------------------- |
| `SAFE`                                                     | 5                                             |
| `NEEDS_IDEMPOTENCY`                                        | 5                                             |
| `NEEDS_PROVIDER_HARDENING`                                 | 1                                             |
| `NEEDS_AUDIT_HARDENING`                                    | 1                                             |
| `BLOCKER`                                                  | 2                                             |
| `NEEDS_STATE_GUARD` / `NEEDS_CONCURRENCY_GUARD` as primary | 0 (both appear as secondary tags on BLOCKERs) |

---

## 1. `portal360.auth.claimInvitation`

| Field                                | Value                                                                                                                                                                                     |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Procedure**                        | `portal360.auth.claimInvitation`                                                                                                                                                          |
| **Route/UI**                         | Duplicate of REST; UI uses REST `apps/web/src/app/portal/invite/[token]/page.tsx` → `POST /api/portal/claim-invitation`                                                                   |
| **Domain**                           | Auth / invitation                                                                                                                                                                         |
| **Feature**                          | (pre-feature) account claim                                                                                                                                                               |
| **PortalAction**                     | N/A (pre-session; Firebase ID token + invitation token)                                                                                                                                   |
| **Resource type**                    | `portalUsers` (invitation)                                                                                                                                                                |
| **Current state requirements**       | `invitationStatus === 'pending'`; not expired; user not suspended/locked/revoked; account `portalEnabled` and status not `suspended`/`archived`/`locked`; account.customerId matches user |
| **Resulting state**                  | User: `status=active`, `invitationStatus=consumed`, `authUserId` set, token hash cleared; session minted via `createPortalSessionContext`                                                 |
| **Tenant check**                     | Org derived from invitation doc path                                                                                                                                                      |
| **Customer check**                   | Bound to invitation’s `customerId`                                                                                                                                                        |
| **Ownership check**                  | Token hash lookup + account/customer match in transaction                                                                                                                                 |
| **Idempotency (current)**            | Second claim fails (`invitationStatus !== 'pending'` → `{ok:false}`)                                                                                                                      |
| **Concurrency protection (current)** | Firestore `runTransaction`                                                                                                                                                                |
| **Audit event**                      | `logCustomerActivity` note “Portal invitation claimed”                                                                                                                                    |
| **Provider call**                    | Firebase Auth `verifyIdToken`                                                                                                                                                             |
| **Test coverage**                    | Integration: `portal-phase2-s3.integration.test.ts`, `portal-phase2.integration.test.ts` (claim success/fail/race)                                                                        |
| **Risk**                             | Medium — auth binding; mitigated by transaction                                                                                                                                           |
| **Classification**                   | `SAFE`                                                                                                                                                                                    |

---

## 2. `portal360.auth.establishSession`

| Field                                | Value                                                                                                          |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| **Procedure**                        | `portal360.auth.establishSession`                                                                              |
| **Route/UI**                         | Cookie set via `POST /api/portal/session` (`portal-session-client.ts`); tRPC returns session token for clients |
| **Domain**                           | Auth / session                                                                                                 |
| **Feature**                          | dashboard access bootstrap                                                                                     |
| **PortalAction**                     | N/A (magic access token → session)                                                                             |
| **Resource type**                    | `portalSessions` / signed session JWT                                                                          |
| **Current state requirements**       | Valid access token; `requirePortalAccess` succeeds; account has `primaryPortalUserId`                          |
| **Resulting state**                  | New portal session context + token                                                                             |
| **Tenant check**                     | Via access-token account resolution                                                                            |
| **Customer check**                   | Customer from portal access context                                                                            |
| **Ownership check**                  | Token → account → customer                                                                                     |
| **Idempotency (current)**            | Each call mints a new session (no reuse)                                                                       |
| **Concurrency protection (current)** | None required for mint                                                                                         |
| **Audit event**                      | None on session mint (login recorded later by dashboard)                                                       |
| **Provider call**                    | None                                                                                                           |
| **Test coverage**                    | Session helpers covered in S3/S2 integration; tRPC procedure thin wrapper                                      |
| **Risk**                             | Low–medium — session proliferation                                                                             |
| **Classification**                   | `NEEDS_IDEMPOTENCY` (session mint storm); secondary `NEEDS_AUDIT_HARDENING`                                    |

---

## 3. `portal360.public.markNotificationRead`

| Field                                | Value                                                                                |
| ------------------------------------ | ------------------------------------------------------------------------------------ |
| **Procedure**                        | `portal360.public.markNotificationRead`                                              |
| **Route/UI**                         | `/portal/[token]` home; `/portal/[token]/notifications`                              |
| **Domain**                           | Notifications                                                                        |
| **Feature**                          | `dashboard`                                                                          |
| **PortalAction**                     | `view`                                                                               |
| **Resource type**                    | `portalNotifications`                                                                |
| **Current state requirements**       | Notification exists; `portalUserId === actingUser.id`; optional `customerId` matches |
| **Resulting state**                  | `readAt = now`                                                                       |
| **Tenant check**                     | `requirePortalAuthorized` org scope                                                  |
| **Customer check**                   | Session/token customer + note.customerId                                             |
| **Ownership check**                  | `portalUserId` match (fail → `PORTAL_RESOURCE_NOT_FOUND`)                            |
| **Idempotency (current)**            | Re-write `readAt` (benign)                                                           |
| **Concurrency protection (current)** | Last-write-wins                                                                      |
| **Audit event**                      | None                                                                                 |
| **Provider call**                    | None                                                                                 |
| **Test coverage**                    | Indirect via dashboard authz tests; no dedicated mutation integration                |
| **Risk**                             | Low                                                                                  |
| **Classification**                   | `SAFE`                                                                               |

---

## 4. `portal360.public.markAllNotificationsRead`

| Field                                | Value                                        |
| ------------------------------------ | -------------------------------------------- |
| **Procedure**                        | `portal360.public.markAllNotificationsRead`  |
| **Route/UI**                         | `/portal/[token]/notifications`              |
| **Domain**                           | Notifications                                |
| **Feature**                          | `dashboard`                                  |
| **PortalAction**                     | `view`                                       |
| **Resource type**                    | `portalNotifications` (acting user set)      |
| **Current state requirements**       | Authorized portal user                       |
| **Resulting state**                  | All unread for `portalUserId` get `readAt`   |
| **Tenant check**                     | Org from auth                                |
| **Customer check**                   | Auth customer (query scoped by portalUserId) |
| **Ownership check**                  | Query filter `portalUserId == actingUser.id` |
| **Idempotency (current)**            | Safe re-run                                  |
| **Concurrency protection (current)** | Parallel `colUpdate` (benign races)          |
| **Audit event**                      | None                                         |
| **Provider call**                    | None                                         |
| **Test coverage**                    | Gap — no dedicated integration test found    |
| **Risk**                             | Low                                          |
| **Classification**                   | `SAFE`                                       |

---

## 5. `portal360.public.sendMessage`

| Field                                | Value                                                                                          |
| ------------------------------------ | ---------------------------------------------------------------------------------------------- |
| **Procedure**                        | `portal360.public.sendMessage`                                                                 |
| **Route/UI**                         | `/portal/[token]/messages`                                                                     |
| **Domain**                           | Messaging                                                                                      |
| **Feature**                          | `messaging`                                                                                    |
| **PortalAction**                     | `message`                                                                                      |
| **Resource type**                    | `conversations` / messages                                                                     |
| **Current state requirements**       | Feature enabled + role allows `message`                                                        |
| **Resulting state**                  | Inbound message `status=delivered`; conversation `waiting_on_staff`; timeline `portal_message` |
| **Tenant check**                     | `requirePortalAuthorized`                                                                      |
| **Customer check**                   | Message created for `ctx.customer.id` only                                                     |
| **Ownership check**                  | Customer-scoped conversation ensure                                                            |
| **Idempotency (current)**            | None — each call creates a message                                                             |
| **Concurrency protection (current)** | None                                                                                           |
| **Audit event**                      | Portal timeline event (not staff audit log)                                                    |
| **Provider call**                    | None (in-app portal channel)                                                                   |
| **Test coverage**                    | Integration: role deny + send in `portal-phase2.integration.test.ts`, S4 message isolation     |
| **Risk**                             | Medium — spam/duplicate inbox load                                                             |
| **Classification**                   | `NEEDS_IDEMPOTENCY`                                                                            |

---

## 6. `portal360.public.submitScheduleRequest`

| Field                                | Value                                                                                                                |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| **Procedure**                        | `portal360.public.submitScheduleRequest`                                                                             |
| **Route/UI**                         | `/portal/[token]/schedule-request`                                                                                   |
| **Domain**                           | Scheduling                                                                                                           |
| **Feature**                          | `scheduling`                                                                                                         |
| **PortalAction**                     | `request`                                                                                                            |
| **Resource type**                    | Soft request (communication + timeline); no `scheduleRequests` collection                                            |
| **Current state requirements**       | Feature on; `settings.allowSelfScheduling`; optional property owned by customer                                      |
| **Resulting state**                  | Response `{ status: 'requested' }`; communication inbound; timeline `schedule_request`; optional portal notification |
| **Tenant check**                     | Auth org                                                                                                             |
| **Customer check**                   | Auth customer                                                                                                        |
| **Ownership check**                  | Property `customerId` match when `propertyId` set                                                                    |
| **Idempotency (current)**            | None — duplicates allowed                                                                                            |
| **Concurrency protection (current)** | None                                                                                                                 |
| **Audit event**                      | Timeline + communication only                                                                                        |
| **Provider call**                    | None                                                                                                                 |
| **Test coverage**                    | Gap — no dedicated integration test found                                                                            |
| **Risk**                             | Medium — duplicate ops noise                                                                                         |
| **Classification**                   | `NEEDS_IDEMPOTENCY` (secondary `NEEDS_AUDIT_HARDENING`)                                                              |

---

## 7. `portal360.public.submitServiceRequest`

| Field                                | Value                                                                                             |
| ------------------------------------ | ------------------------------------------------------------------------------------------------- |
| **Procedure**                        | `portal360.public.submitServiceRequest`                                                           |
| **Route/UI**                         | `/portal/[token]/service-request`                                                                 |
| **Domain**                           | Service issues                                                                                    |
| **Feature**                          | `service_requests`                                                                                |
| **PortalAction**                     | `create`                                                                                          |
| **Resource type**                    | `serviceIssues`                                                                                   |
| **Current state requirements**       | Feature on; `allowServiceRequests` + `permissions.requestService`; property ownership if provided |
| **Resulting state**                  | Issue `status=reported`, `source=portal`; communication; timeline `service_request`               |
| **Tenant check**                     | Auth org                                                                                          |
| **Customer check**                   | Issue created with `ctx.customer.id`                                                              |
| **Ownership check**                  | Property ownership validated                                                                      |
| **Idempotency (current)**            | None                                                                                              |
| **Concurrency protection (current)** | None                                                                                              |
| **Audit event**                      | Timeline + communication                                                                          |
| **Provider call**                    | None                                                                                              |
| **Test coverage**                    | Integration: create + role deny in `portal-phase2.integration.test.ts`                            |
| **Risk**                             | Medium — duplicate issues                                                                         |
| **Classification**                   | `NEEDS_IDEMPOTENCY`                                                                               |

---

## 8. `portal360.public.uploadServicePhoto`

| Field                                | Value                                                                         |
| ------------------------------------ | ----------------------------------------------------------------------------- |
| **Procedure**                        | `portal360.public.uploadServicePhoto`                                         |
| **Route/UI**                         | `/portal/[token]/service-request` (pre-submit upload)                         |
| **Domain**                           | Service issues / files                                                        |
| **Feature**                          | `service_requests`                                                            |
| **PortalAction**                     | `create`                                                                      |
| **Resource type**                    | Storage object + portal file ticket                                           |
| **Current state requirements**       | Same gates as service create; content-type jpeg/png/webp; size ≤ config max   |
| **Resulting state**                  | File under `portal-service/{customerId}`; ticket URL returned (no public ACL) |
| **Tenant check**                     | Auth org + storage path prefix                                                |
| **Customer check**                   | Path scoped to customer                                                       |
| **Ownership check**                  | Authz before upload; ticket binds org/customer                                |
| **Idempotency (current)**            | None — orphan uploads possible                                                |
| **Concurrency protection (current)** | None                                                                          |
| **Audit event**                      | None dedicated                                                                |
| **Provider call**                    | Firebase Storage upload                                                       |
| **Test coverage**                    | File ticket / storage rules covered in S5; upload mutation integration gap    |
| **Risk**                             | Medium — storage abuse / orphans                                              |
| **Classification**                   | `NEEDS_IDEMPOTENCY` (secondary `NEEDS_AUDIT_HARDENING`)                       |

---

## 9. `portal360.public.submitRebook`

| Field                                | Value                                                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| **Procedure**                        | `portal360.public.submitRebook`                                                                                          |
| **Route/UI**                         | `/portal/[token]/rebook`                                                                                                 |
| **Domain**                           | Rebooking                                                                                                                |
| **Feature**                          | `rebooking`                                                                                                              |
| **PortalAction**                     | `request`                                                                                                                |
| **Resource type**                    | `rebookingRecords` (+ optional new `proposals`)                                                                          |
| **Current state requirements**       | Feature `rebooking` + `request`; **no check** that record is not already `rebooked` / `upgrade_requested` / `declined`   |
| **Resulting state**                  | Record → `rebooked` or `upgrade_requested`; may `createProposal360`; pipeline `needs_estimate`; communication + timeline |
| **Tenant check**                     | Auth org                                                                                                                 |
| **Customer check**                   | Record matched by `customerId`                                                                                           |
| **Ownership check**                  | Customer-scoped record lookup                                                                                            |
| **Idempotency (current)**            | **None** — repeat submit re-runs `processRebookRecord` and can create another proposal                                   |
| **Concurrency protection (current)** | **None** — no transaction on record status                                                                               |
| **Audit event**                      | `logCustomerActivity` + timeline                                                                                         |
| **Provider call**                    | None                                                                                                                     |
| **Test coverage**                    | Gap for portal rebook mutation / double-submit                                                                           |
| **Risk**                             | **High** — duplicate proposals, pipeline churn, revenue double-count risk                                                |
| **Classification**                   | `BLOCKER` (`NEEDS_STATE_GUARD` + `NEEDS_IDEMPOTENCY` + `NEEDS_CONCURRENCY_GUARD`)                                        |

---

## 10. `portal360.public.qrSendCode`

| Field                                | Value                                                                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | -------- | --------- | ------- | ------- | ------------------------------------------------------------------ |
| **Procedure**                        | `portal360.public.qrSendCode`                                                                                             |
| **Route/UI**                         | `/portal/access/[token]`                                                                                                  |
| **Domain**                           | QR / OTP                                                                                                                  |
| **Feature**                          | (pre-session) QR activation                                                                                               |
| **PortalAction**                     | N/A                                                                                                                       |
| **Resource type**                    | `portalQrCodes`, `portalQrVerifications`                                                                                  |
| **Current state requirements**       | QR not inactive (`revoked                                                                                                 | replaced | suspended | invalid | expired | draft`) and not time-expired; contact matches customer email/phone |
| **Resulting state**                  | New OTP hash row; prior open OTPs invalidated; rate-limit counters                                                        |
| **Tenant check**                     | QR → org                                                                                                                  |
| **Customer check**                   | QR.customerId → customer contact match                                                                                    |
| **Ownership check**                  | Contact must match customer record (enumeration-safe generic response)                                                    |
| **Idempotency (current)**            | Resend cooldown + rate limits; new OTP invalidates old                                                                    |
| **Concurrency protection (current)** | Soft (invalidate open OTPs); not transactional                                                                            |
| **Audit event**                      | `writeQrAudit` + scan events                                                                                              |
| **Provider call**                    | Emulator delivery adapter in EMULATOR; **live path** can call Resend/Twilio when provider not emulator/`live-disabled-s3` |
| **Test coverage**                    | Strong S3 integration (rate limit, mismatch, cooldown)                                                                    |
| **Risk**                             | High if live credentials present outside intended env                                                                     |
| **Classification**                   | `NEEDS_PROVIDER_HARDENING`                                                                                                |

---

## 11. `portal360.public.qrVerify`

| Field                                | Value                                                                                                                                                          |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Procedure**                        | `portal360.public.qrVerify`                                                                                                                                    |
| **Route/UI**                         | `/portal/access/[token]`                                                                                                                                       |
| **Domain**                           | QR / OTP / activation                                                                                                                                          |
| **Feature**                          | (pre-session) activation                                                                                                                                       |
| **PortalAction**                     | N/A                                                                                                                                                            |
| **Resource type**                    | `portalQrCodes`, `portalAccounts`, `customers`                                                                                                                 |
| **Current state requirements**       | `acceptTerms`; QR active/reusable path; unconsumed unexpired OTP; attempts &lt; max                                                                            |
| **Resulting state**                  | OTP consumed; portal account ensured `active`; customer `portalEnabled` + token; QR → `reusable` or `used_for_activation`; timeline/notify on first activation |
| **Tenant check**                     | QR org                                                                                                                                                         |
| **Customer check**                   | QR.customerId                                                                                                                                                  |
| **Ownership check**                  | OTP bound to qrCodeId                                                                                                                                          |
| **Idempotency (current)**            | OTP single-consume; re-verify needs new OTP. `used_for_activation` **not** in `isInactiveStatus` — further OTP cycles still possible                           |
| **Concurrency protection (current)** | Partial (OTP consume updates); account ensure not fully transactional with QR status                                                                           |
| **Audit event**                      | QR audit `activated` + scan + timeline                                                                                                                         |
| **Provider call**                    | None on verify                                                                                                                                                 |
| **Test coverage**                    | Strong S3 integration (success, bad code, max attempts, terms)                                                                                                 |
| **Risk**                             | High — activates portal + rotates access; state reuse on non-reusable codes needs tightening                                                                   |
| **Classification**                   | `BLOCKER` (`NEEDS_STATE_GUARD` on post-activation QR status; secondary concurrency)                                                                            |

---

## 12. REST `POST /api/portal/claim-invitation`

| Field                             | Value                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------ |
| **Procedure**                     | REST (canonical UI path for invite claim)                                            |
| **Route/UI**                      | `apps/web/src/app/api/portal/claim-invitation/route.ts`; UI `/portal/invite/[token]` |
| **Domain**                        | Auth / invitation                                                                    |
| **Feature**                       | pre-session                                                                          |
| **PortalAction**                  | N/A                                                                                  |
| **Resource type**                 | Same as §1                                                                           |
| **Current state requirements**    | Same as `claimPortalInvitation`                                                      |
| **Resulting state**               | Claim + `createPortalSessionContext` + sets `__portal_session` cookie                |
| **Tenant / customer / ownership** | Same as §1                                                                           |
| **Idempotency / concurrency**     | Same as §1 (transaction)                                                             |
| **Audit event**                   | Same as §1                                                                           |
| **Provider call**                 | Firebase Auth verifyIdToken                                                          |
| **Test coverage**                 | Firebase helper tests; REST route thin                                               |
| **Risk**                          | Medium                                                                               |
| **Classification**                | `SAFE`                                                                               |

---

## 13. REST `POST /api/portal/session`

| Field                                | Value                                                                           |
| ------------------------------------ | ------------------------------------------------------------------------------- |
| **Procedure**                        | REST session establish / cookie attach                                          |
| **Route/UI**                         | `apps/web/src/app/api/portal/session/route.ts`; `establishPortalSessionCookie`  |
| **Domain**                           | Auth / session                                                                  |
| **Feature**                          | session bootstrap                                                               |
| **PortalAction**                     | N/A                                                                             |
| **Resource type**                    | Cookie `__portal_session`                                                       |
| **Current state requirements**       | Valid `sessionToken` (≥16) **or** valid `accessToken` (≥8)                      |
| **Resulting state**                  | HttpOnly cookie set; optionally mints session from access token                 |
| **Tenant / customer / ownership**    | Via `verifyPortalSessionTokenServer` or `establishPortalSessionFromAccessToken` |
| **Idempotency (current)**            | Cookie overwrite; accessToken path mints new session each time                  |
| **Concurrency protection (current)** | N/A                                                                             |
| **Audit event**                      | None                                                                            |
| **Provider call**                    | None                                                                            |
| **Test coverage**                    | Session verify covered in S2/S3 helpers                                         |
| **Risk**                             | Medium — cookie fixation mitigated by verify; mint storm on accessToken         |
| **Classification**                   | `NEEDS_AUDIT_HARDENING` (secondary `NEEDS_IDEMPOTENCY`)                         |

---

## 14. REST `DELETE /api/portal/session`

| Field                                | Value                                                                                                                   |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| **Procedure**                        | REST logout cookie clear                                                                                                |
| **Route/UI**                         | `clearPortalSessionCookie` / portal logout paths                                                                        |
| **Domain**                           | Auth / session                                                                                                          |
| **Feature**                          | session teardown                                                                                                        |
| **PortalAction**                     | N/A                                                                                                                     |
| **Resource type**                    | Cookie only (does not bump `sessionVersion` / server revoke)                                                            |
| **Current state requirements**       | None                                                                                                                    |
| **Resulting state**                  | Cookie cleared (`maxAge: 0`)                                                                                            |
| **Tenant / customer / ownership**    | N/A                                                                                                                     |
| **Idempotency (current)**            | Safe                                                                                                                    |
| **Concurrency protection (current)** | N/A                                                                                                                     |
| **Audit event**                      | None                                                                                                                    |
| **Provider call**                    | None                                                                                                                    |
| **Test coverage**                    | Gap / client helper only                                                                                                |
| **Risk**                             | Low for cookie clear; **note:** does not invalidate server-side session version (staff `logoutAllSessions` is separate) |
| **Classification**                   | `SAFE` (residual: client-only logout)                                                                                   |

---

## Explicit non-mutations (documented for completeness)

| Surface                                   | Why excluded                                                             |
| ----------------------------------------- | ------------------------------------------------------------------------ |
| `portal360.auth.authorizeRoute`           | **query** — allow/deny only                                              |
| `POST /api/portal/authorize-route`        | Authz decision only; no writes                                           |
| `GET /api/portal/files`                   | Ticketed read                                                            |
| Proposal / agreement / mockup / pay links | Public token routers (`/p`, `/a`, `/m`, `/pay`), not portal360 mutations |
| Reviews page                              | Queries only — no `submitReview` portal mutation                         |

---

## BLOCKER / high-risk shortlist (S6 disposition)

1. **`submitRebook`** — **REMEDIATED:** terminal replay + idempotency key; integration evidence for double-submit.
2. **`qrVerify` / QR OTP** — **REMEDIATED:** `used_for_activation` terminal in `isInactiveStatus`.
3. **`qrSendCode`** — **MITIGATED:** emulator delivery adapter in EMULATOR; provider hardening from P2-S3 preserved.
4. **`sendMessage` / `submitServiceRequest` / `submitScheduleRequest`** — **REMEDIATED:** `withPortalIdempotency` on all three.
5. **Checkout / invoice pay** — **REMEDIATED:** server amount + safe mode; REAL PAYMENT TRANSACTIONS: 0 in evidence.
6. **Session mint (`establishSession`)** — **DEFERRED:** audit/idempotency on session mint low priority.

## Remediation priority (S6 — completed items)

1. ~~Blocker: rebook state + idempotency + concurrency.~~ Done.
2. ~~Blocker: QR post-activation status gate (`used_for_activation` deny OTP).~~ Done.
3. ~~Provider hard-fail outside EMULATOR for checkout.~~ Safe mode implemented.
4. ~~Client + server idempotency keys for create/request mutations.~~ Done.
5. Integration gaps filled: schedule request, rebook double-submit, parallel concurrency, rate limit, stale-page denial.

---

## UI → mutation call map

| UI route                           | Mutations called                                   |
| ---------------------------------- | -------------------------------------------------- |
| `/portal/invite/[token]`           | REST `POST /api/portal/claim-invitation`           |
| `/portal/access/[token]`           | `qrSendCode`, `qrVerify`                           |
| `/portal/[token]` (home)           | `markNotificationRead`                             |
| `/portal/[token]/notifications`    | `markNotificationRead`, `markAllNotificationsRead` |
| `/portal/[token]/messages`         | `sendMessage`                                      |
| `/portal/[token]/service-request`  | `uploadServicePhoto`, `submitServiceRequest`       |
| `/portal/[token]/schedule-request` | `submitScheduleRequest`                            |
| `/portal/[token]/rebook`           | `submitRebook`                                     |
| Portal shell / login helpers       | REST `POST`/`DELETE /api/portal/session`           |
