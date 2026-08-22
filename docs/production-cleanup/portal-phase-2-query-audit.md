# Customer Portal Phase 2 public query audit

**ENVIRONMENT=EMULATOR**

`portal360.public` still uses the dual-write magic-token path as the primary trust source in Phase 2: canonical `portalAccounts.accessToken`, with fallback to legacy `customers.portalToken`. `PASS` means the implementation derives tenant/customer scope server-side and applies it to the operation. `PARTIAL` means scope exists but session/role/action enforcement is not yet complete.

| Procedure                                          | Collection(s) / service                                | Trusted scope                                        | Customer-scoped             | Feature             | Result  |
| -------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------- | --------------------------- | ------------------- | ------- |
| `dashboard`                                        | customers, properties, jobs, calendar events, invoices | magic token                                          | Yes                         | dashboard           | PASS    |
| `timeline`                                         | portalTimelineEvents                                   | magic token                                          | Yes + visible only          | dashboard           | PASS    |
| `notifications`                                    | portalNotifications                                    | magic token                                          | Yes                         | dashboard           | PASS    |
| `markNotificationRead`, `markAllNotificationsRead` | portalNotifications                                    | magic token                                          | Yes                         | dashboard           | PARTIAL |
| `contacts`                                         | contacts                                               | magic token                                          | Yes                         | properties          | PASS    |
| `serviceRequests`                                  | serviceIssues/service requests                         | magic token                                          | Yes                         | service_requests    | PASS    |
| `submitServiceRequest`, `uploadServicePhoto`       | service issues, storage                                | magic token                                          | Yes                         | service_requests    | PARTIAL |
| `agreements`                                       | multiYearAgreements                                    | magic token                                          | Yes                         | agreements          | PASS    |
| `documents`                                        | documents                                              | magic token                                          | Yes + customer-visible      | documents           | PASS    |
| `storage`                                          | storage records                                        | magic token                                          | Yes                         | storage             | PASS    |
| `reviews`                                          | review requests                                        | magic token                                          | Yes                         | reviews             | PASS    |
| `referrals`                                        | referral records/settings                              | magic token                                          | Yes                         | referrals           | PASS    |
| `messages`                                         | communications/messages                                | magic token                                          | Yes                         | messaging           | PASS    |
| `sendMessage`                                      | communications/messages                                | magic token                                          | Yes                         | messaging           | PARTIAL |
| `properties`                                       | properties                                             | magic token                                          | Yes                         | properties          | PASS    |
| `consultations`                                    | consultations                                          | magic token                                          | Yes                         | consultations       | PASS    |
| `takedowns`                                        | jobs/calendar data                                     | magic token                                          | Yes                         | takedowns           | PASS    |
| `submitScheduleRequest`                            | calendar/service request data                          | magic token                                          | Yes + property ownership    | scheduling          | PARTIAL |
| `invoices`                                         | invoices                                               | magic token                                          | Yes                         | billing             | PASS    |
| `proposals`                                        | proposals                                              | magic token                                          | Yes                         | proposals           | PASS    |
| `mockups`                                          | mockups                                                | magic token                                          | Yes                         | mockups             | PASS    |
| `jobs`                                             | jobs                                                   | magic token                                          | Yes                         | install_tracking    | PASS    |
| `jobDetail`                                        | jobs                                                   | magic token + job ID                                 | Yes; job ownership checked  | install_tracking    | PASS    |
| `signingHub`                                       | proposals, agreements                                  | magic token                                          | Yes                         | e_sign              | PASS    |
| `submitRebook`, `rebookInfo`                       | rebooking/customer/job data                            | magic token                                          | Yes                         | rebooking           | PARTIAL |
| `qrLanding`                                        | portalQrCodes, scans/audit                             | QR token/hash                                        | Yes, derived from QR record | dashboard/deep link | PASS    |
| `qrSendCode`, `qrVerify`                           | portalQrCodes, portalQrVerifications, scans/audit      | QR token + OTP                                       | Yes, derived from QR record | activation          | PARTIAL |
| `claimInvitation`                                  | portalUsers, portalAccounts                            | invitation token + server-verified Firebase ID token | Yes, derived server-side    | identity            | PASS    |
| `establishSession`                                 | portalAccounts/portalUsers; customers fallback         | magic token                                          | Yes, derived server-side    | identity            | PASS    |

## Remaining authorization work

Feature availability is checked in underlying helpers on many reads, but public procedures do not consistently consume `__portal_session` or call the canonical role/action resolver. Mutation rows are therefore `PARTIAL` even where customer isolation is present. Before launch, make the server session and `packages/types/src/portal-permissions.ts` authoritative for each action, retaining magic-token establishment only as a compatibility entry point.

## P2-S4 cutover

S4 makes customer equality queries and reviewed customer-scoped helpers the canonical list path. Organization-scan fallbacks are prohibited by `audit:portal-query-scope`; `colListByCustomerId` no longer broadens on failure. Public resource serializers are allowlists, including timeline and notifications, and `audit:portal-public-dtos` blocks sensitive field references or raw document returns. Detailed classifications are in `portal-phase-2-s4-query-map.md`.

**NO DEPLOYMENT:** no query, index, rule, or data change was applied outside the emulator.
