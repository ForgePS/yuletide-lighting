# Portal Phase 2 S3 — Rollback

**ENVIRONMENT:** EMULATOR  
**Deployment:** NOT AUTHORIZED

## Principle

Rollback S3 invitation/OTP entry points without disabling S1 authorization or S2 `__portal_session` isolation/invalidation.

## Prepare-only procedure

1. Stop new invitation issuance and OTP sends at the route/feature boundary.
2. Keep `requirePortalAuthorized`, `portal-permissions.ts`, `portalPublicProcedure`, session verification, and lifecycle invalidation unchanged.
3. Revoke or replace S3 pending invitations and consume outstanding OTP records; do not restore raw secrets.
4. Keep public responses generic and direct affected users to support/new access.
5. Retain audit/activity records and capture counts by lifecycle state without token, OTP, or customer data in logs.
6. Revert S3 claim/delivery/rate-limit wiring only through reviewed source changes and emulator validation.
7. Re-run permission/session static gates and S1/S2 regression tests before any later release decision.

## Prohibited rollback shortcuts

- Do not fall back to plaintext invitation or OTP storage.
- Do not enable live email/SMS.
- Do not accept client role/org/customer identity.
- Do not merge staff and portal cookies.
- Do not invalidate the S1/S2 controls to recover availability.

Legacy plaintext magic-token compatibility remains a known deferred risk; this rollback does not expand or migrate it.
