# Portal Phase 2 S3 — Invitation Design

**ENVIRONMENT:** EMULATOR

## Secret and lifecycle

- Generate opaque invitation tokens with the portal cryptographic helper.
- Return the raw token only at creation to the emulator delivery/copy-once boundary; never log or persist it.
- Persist a purpose-separated hash as `invitationTokenHash`.
- Canonical lifecycle is `PENDING → CLAIMED | EXPIRED | REVOKED | REPLACED`.
- Current storage maps canonical `CLAIMED` to `invitationStatus: consumed` plus `claimedAt`/`invitationConsumedAt`.
- Expiry, revoke, replacement, or claim clears `invitationTokenHash`.
- Resend never reuses a token: prior pending invitations for the same customer/email become `REPLACED`, then a new `PENDING` record is created.

## Atomic claim

1. Hash the submitted token and locate at most one matching portal user.
2. In a Firestore transaction, reload the record and require pending, unexpired, unlocked, unrevoked user state.
3. Load and validate the linked portal account and customer relationship in the same transaction.
4. Bind `authUserId` derived from verified Firebase identity; clients cannot select role, organization, or customer.
5. Mark claimed/consumed, clear the hash, reset verification failures, and activate the user.
6. Create a dedicated portal session and pass it to `/api/portal/session`.

Concurrent or repeated claims fail closed with `PORTAL_PUBLIC_MESSAGES.accessUnavailable`.

## Claim UI

`apps/web/src/app/portal/invite/[token]/page.tsx` provides the minimal flow: validate token shape, establish Firebase identity, invoke public claim, post the returned session token, set `__portal_session`, then route to portal home. Invalid, expired, revoked, replaced, and already-claimed invitations share the same public message.
