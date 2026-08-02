# Customer Portal Phase 2 — Checkpoint P2-S2

**Phase:** PORTAL-P2-S2  
**Title:** Dedicated Portal Session Architecture and Lifecycle Invalidation  
**Status:** COMPLETE  
**Date:** 2026-07-31  
**Branch:** `production/yuletide-cleanup-launch-readiness`  
**ENVIRONMENT:** EMULATOR  
**Production writes:** 0  
**Deployment:** NO

---

## Mission

Make `__portal_session` a first-class portal access path alongside magic tokens, with lifecycle invalidation and hard separation from staff `__session`.

## Delivered

| Item                                                                  | Status                     |
| --------------------------------------------------------------------- | -------------------------- |
| tRPC `ctx.portalSessionToken` from `__portal_session` cookie          | Done                       |
| `portalPublicProcedure` clears staff `auth`                           | Done                       |
| Public handlers accept `{ token?, sessionToken? }`; session preferred | Done                       |
| Optional magic token when session present (validators)                | Done                       |
| `/api/portal/session` POST/GET/DELETE                                 | Done (prior + used by UI)  |
| Portal UI establishes session after dashboard load                    | Done — `PortalAuthedFrame` |
| QR OTP success establishes session before redirect                    | Done                       |
| Sign out clears portal cookie                                         | Done — `PortalShell`       |
| `logoutAllPortalSessions` staff API                                   | Done                       |
| `changePortalUserRole` invalidates sessions                           | Done                       |
| Suspend / revoke / rotate already bump `sessionVersion`               | Retained                   |
| Session design doc updated                                            | Done                       |

## Tests (ENVIRONMENT=EMULATOR)

S2 session suite (emulator): **9 passed**, 0 failed.

Coverage:

- Session-only dashboard (magic token optional)
- Prefer session over invalid token
- logout-all / role-change / suspend invalidate sessions
- Customer A1 session cannot surface A2
- Tenant A session cannot surface Tenant B customer
- Staff procedure UNAUTHORIZED with portal cookie only
- portalPublicProcedure ignores staff auth; session authorizes portal dashboard
- P2-S1 role enforcement retained (separate suite)

Magic-link / QR / token / OTP compatibility preserved. No production contact. No deploy.

## Explicitly out of S2

- Removing magic tokens from URLs
- Invitation claim UI (S3)
- DTO/query fallback closeout (S4)
- Deploy / production writes

## Acceptance

| Criterion                                                   | Met |
| ----------------------------------------------------------- | --- |
| Dedicated portal cookie separate from staff                 | YES |
| Portal procedures prefer session when present               | YES |
| Staff procedures reject portal-only context                 | YES |
| Portal procedures ignore staff `__session` for authz        | YES |
| Logout / suspend / revoke / rotate / role change invalidate | YES |
| UI establish + logout                                       | YES |
| No production write / no deploy                             | YES |

**P2-S2 STATUS: COMPLETE**  
**Next:** P2-S3 — Invitation claim + OTP hardening  
**Evidence:** `portal-phase-2-session-design.md`
