# Portal Phase 2 S3 — Baseline

**STATUS:** CAPTURED  
**ENVIRONMENT:** EMULATOR  
**Deployment / production writes:** PROHIBITED

## Pre-hardening state

- Portal access supported legacy magic tokens and QR activation; legacy `customers.portalToken` values remained plaintext for compatibility.
- Invitations were represented on organization-scoped `portalUsers`, but token-at-rest, replacement, expiry, and atomic-claim behavior needed one documented contract.
- QR verification codes existed, but TTL, attempt ceilings, lockout, resend cooldown, purpose binding, replacement invalidation, and generic responses needed centralized enforcement.
- Public claim inputs needed an explicit rule that role, organization, customer, and user identity are server-derived.
- Delivery paths needed an emulator-only adapter that could capture secrets for tests without logging or contacting live providers.
- Portal and staff sessions were already separated through `__portal_session`; S3 must preserve the S1 permission resolver and S2 session invalidation.

## S3 target

S3 hardens invitation and OTP secrets, lifecycle transitions, public messaging, delivery, and static gates. It does not migrate legacy plaintext magic tokens, enable live delivery, deploy, or write production data.

## Evidence boundary

All S3 implementation and test evidence is local/emulator-only. Test commands remain `PENDING` in the completion record until actually executed.
