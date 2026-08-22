# Portal Phase 2 S3 — OTP Design

**ENVIRONMENT:** EMULATOR

## Record contract

Each OTP record stores `codeHash`, `qrCodeId`, `customerId`, `purpose`, `channel`, `attempts`, `expiresAt`, and `consumedAt`. The raw code exists only during generation and emulator delivery capture.

## Required controls

- Generate six-to-eight digit codes with the portal cryptographic helper; never use `Math.random`.
- Hash with purpose separation (`portal-otp`) and compare using a timing-safe helper.
- Default TTL is 10 minutes; expired records cannot verify.
- Default maximum is five attempts. Each mismatch increments attempts; the final attempt consumes the code.
- Apply a 15-minute lockout window through configured rate-limit buckets where request limits are exceeded.
- Enforce a 60-second resend cooldown.
- Bind this flow to `purpose: portal_access`; a code for another purpose cannot authorize portal access.
- Before resend, consume every outstanding OTP for the QR. A replacement is the only usable code.
- Apply request limits before expensive identity/delivery work and use generic `PORTAL_PUBLIC_MESSAGES`.

## Success behavior

Successful verification consumes the OTP, activates eligible portal state, and continues through the S2 session path. It does not expose the code/hash, disclose account existence, or allow client-selected tenant/customer/role.

## Production boundary

S3 evidence uses the emulator delivery provider only. Production delivery and a shared/distributed production limiter require a later authorized design and rollout.
