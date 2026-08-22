# Portal Phase 2 S3 — Test Plan

**ENVIRONMENT:** EMULATOR  
**Results:** PENDING

## Unit

- Cryptographic token/OTP generation, purpose-separated hashes, timing-safe comparison.
- Typed security-config defaults, clamps, TTLs, cooldowns, attempt ceilings, and lockout.
- `PORTAL_PUBLIC_MESSAGES` contains no state-specific enumeration clues.
- Static audits reject insecure randomness, raw secret persistence/logging, client authority fields, and unsafe delivery wiring.

## Integration (Firestore emulator)

- Invitation create stores only hash; valid claim is atomic and binds server-verified identity.
- Duplicate/concurrent claim has one winner; expired/revoked/replaced/claimed tokens fail identically.
- Resend replaces prior pending invitation and invalidates its hash.
- OTP record stores hash, purpose, TTL, and attempts; old OTP is invalid after resend.
- Cooldown and token/QR/contact limits apply; max attempts consume the code.
- Claim/OTP success establishes `__portal_session`; staff auth remains ignored by `portalPublicProcedure`.

## E2E and accessibility

- Invite: ready, busy, success, generic unavailable, keyboard-only, focus, and screen-reader announcements.
- OTP: send/resend cooldown, invalid/expired/exhausted/replaced code, success, and generic errors.
- Viewports: phone, tablet, desktop; no overflow or pointer-only action.
- Run axe/WCAG checks on invite and OTP critical states.

## Commands

Commands and outputs remain `PENDING` until run. No staging, deploy, live delivery, or production write is permitted.
