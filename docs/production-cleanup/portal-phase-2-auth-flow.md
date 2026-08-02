# Customer Portal Phase 2 — Authentication Flow

**ENVIRONMENT:** EMULATOR  
**Deployment / production writes:** PROHIBITED

## Access paths

- Legacy magic access token remains a compatibility input. `/api/portal/session` exchanges `accessToken` for the dedicated `__portal_session` cookie.
- Invitation claim at `/portal/invite/[token]` verifies Firebase identity, atomically claims the hashed invitation, receives a session token, and posts it to `/api/portal/session`.
- QR access validates a hashed QR token, sends a purpose-bound hashed OTP through emulator delivery, then activates eligible portal access.

## Trust boundary

`portalPublicProcedure` clears staff auth. Portal authorization uses a validated portal session or compatibility access token and `requirePortalAuthorized`; clients cannot select organization, customer, role, or enabled features. The dashboard and failed claim/OTP paths use `accessUnavailable`/other `PORTAL_PUBLIC_MESSAGES`.

## P2-S3 addition

Invitations and OTPs are hashed at rest, replacements invalidate predecessors, claims are transactional, OTPs have TTL/attempt/cooldown controls, and delivery is emulator-only. Legacy plaintext magic-token migration is documented separately and not applied in S3.
