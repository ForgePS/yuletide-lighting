# Portal Phase 2 S3 — OTP Map

**ENVIRONMENT:** EMULATOR

## Current flow

1. `/portal/access/[token]` resolves a hashed QR token through `portal-qr360.ts`.
2. `qrSendCode` validates the QR and submitted contact using enumeration-safe responses.
3. `sendPortalQrVerificationCode` applies request limits, resend cooldown, and invalidates open codes.
4. A cryptographically generated OTP is stored only as `codeHash` in `portalQrVerifications` with `purpose: portal_access`, expiry, attempts, and consumption state.
5. The emulator provider in `portal-delivery.ts` captures the raw OTP for tests; it refuses production use.
6. `qrVerify` compares hashes in constant time, increments attempts, consumes exhausted/accepted codes, and activates portal access.

## Controls

- Typed values come from `portal-security-config.ts`.
- `portal-rate-limit.ts` limits request dimensions for token/QR/contact in emulator evidence.
- Old OTPs are consumed before replacement; resend cooldown prevents rapid cycling.
- `PORTAL_PUBLIC_MESSAGES` avoids account, contact, token, expiry, and revocation enumeration.
- Verification purpose is bound to `portal_access`.

## Remaining gaps

- The in-memory limiter is not a production distributed control.
- Live email/SMS delivery is disabled for S3.
- Browser, accessibility, and broader rules evidence remain planned; test results are not claimed here.
- Legacy magic-token plaintext storage is outside the OTP path and deferred.
