# Portal Phase 2 S6 — Audit event map

**ENVIRONMENT:** EMULATOR

Portal mutations emit customer-visible timeline events, communications, and staff activity logs. S6 does not introduce a separate audit collection — events flow through existing P2-S1/S4 channels.

## Portal create mutations

| Mutation                      | Timeline event                                     | Communication                                          | Staff activity                                                  |
| ----------------------------- | -------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------- |
| `submitPortalServiceRequest`  | `service_request` — "Service request submitted"    | Inbound `portal_message` with title/body               | —                                                               |
| `submitPortalScheduleRequest` | Schedule-related timeline entry                    | Inbound `portal_message` — "Schedule request — {type}" | —                                                               |
| `sendPortalMessage`           | `portal_message` — "Message sent" (truncated body) | Via `receivePortalMessage` thread                      | —                                                               |
| `submitPortalRebookRequest`   | `rebook_request`                                   | Inbound rebook summary                                 | `logCustomerActivity` (estimate_sent) via `processRebookRecord` |

## Public-token mutations (out-of-band from portal360)

| Mutation                       | Primary audit                                           |
| ------------------------------ | ------------------------------------------------------- |
| `recordPublicApproval`         | Proposal approval subcollection; pipeline sync          |
| `recordAgreementSignature`     | Agreement `signedAt`, `signedByName`; status → `active` |
| `recordCustomerMockupApproval` | Mockup status update; pipeline stage sync               |

## Auth / session mutations

| Mutation                               | Audit                                                      |
| -------------------------------------- | ---------------------------------------------------------- |
| `claimInvitation` / REST claim         | `logCustomerActivity` — "Portal invitation claimed"        |
| `qrSendCode`                           | `writeQrAudit` + scan events                               |
| `qrVerify`                             | QR audit `activated` + scan + timeline on first activation |
| `establishSession` / REST session POST | None on mint (login recorded by dashboard later)           |
| `DELETE /api/portal/session`           | None (cookie clear only)                                   |

## Notification reads

| Mutation                   | Effect                                     |
| -------------------------- | ------------------------------------------ |
| `markNotificationRead`     | Sets `readAt` on owned notification        |
| `markAllNotificationsRead` | Bulk `readAt` for acting user's unread set |

No dedicated audit log entry; benign idempotent writes.

## Idempotency store (not customer-visible)

`organizations/{orgId}/portalIdempotencyKeys/{hash}` — stores `resultJson`, scope fields, `createdAt`. Used for replay only; not exposed in portal timeline.

## Secret exclusion

Timeline/communication payloads must not contain: Stripe secrets, OTP codes, session secrets, raw storage paths. Integration test asserts timeline blob excludes `sk_live`, `otp`, `sessionSecret`, `stripe_secret`.

## Static audits

| Command                            | Purpose                                                                           |
| ---------------------------------- | --------------------------------------------------------------------------------- |
| `npm run audit:portal-mutations`   | Guard module, checkout authority, transition guards, QR terminal, rebook terminal |
| `npm run audit:portal-idempotency` | Idempotency wiring on creates, replay on public-token flows                       |

Prior S1–S5 audits (permissions, sessions, auth-security, query-scope, public-dtos, routes, files) unchanged in scope.

## Cross-reference

Full mutation inventory (pre-S6 baseline + S6 remediation): `portal-phase-2-s6-mutation-map.md`.
