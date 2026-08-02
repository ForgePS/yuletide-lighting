# Portal Phase 2 S3 — Rate-Limit Design

**ENVIRONMENT:** EMULATOR

`packages/firebase/src/portal-rate-limit.ts` is the S3 enforcement adapter. It consumes typed limits from `portal-security-config.ts` and stores emulator/test buckets in memory.

## Dimensions

- Pre-lookup token fingerprint: limits invalid-token probing without storing the raw token.
- QR identifier: limits repeated requests against one portal access path.
- Normalized contact: limits repeated requests to one email/phone across links.
- Verification attempts: OTP records cap guesses; exhausted codes are consumed.
- Invitation claim: configuration defines claim window/cap for claim-path enforcement.

Keys contain only normalized identifiers or hashes; never raw invitation tokens or OTPs. Public responses do not disclose which dimension blocked a request and use `PORTAL_PUBLIC_MESSAGES`.

## Timing defaults

- OTP requests: 10 per 15 minutes.
- OTP lockout: 15 minutes.
- OTP resend cooldown: 60 seconds.
- Invitation claims: 20 per 15 minutes.
- Invitation resend cooldown: 60 seconds.

## Boundary and follow-up

The current map-backed limiter is deterministic emulator evidence, not a production distributed limiter. Before deployment authorization, replace it with an atomic shared store, define trusted IP extraction, retention/observability, and fail-closed degradation behavior. S1 authorization and S2 session invalidation remain independent and enabled.
