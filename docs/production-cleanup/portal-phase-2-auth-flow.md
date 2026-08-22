# Customer Portal Phase 2 — Authentication Flow

**ENVIRONMENT:** EMULATOR  
**DATE:** 2026-08-03  
**Deployment / production writes:** PROHIBITED

## Access paths

- Legacy magic access token remains a compatibility entry credential. `/api/portal/session` exchanges `accessToken` for the dedicated `__portal_session` cookie.
- **P2-S7 / S7B session-first cutover:** After exchange, `LegacyPortalEntryShim` `router.replace`s to tokenless `/portal/app/...`; legacy `/portal/{token}/...` URLs are entry shims only (mapper in `packages/types/src/portal-legacy-path.ts`). Scope conflict → HTTP 409.
- Invitation claim at `/portal/invite/[token]` verifies Firebase identity, atomically claims the hashed invitation, receives a session token, and posts it to `/api/portal/session`.
- QR access validates a hashed QR token, sends a purpose-bound hashed OTP through emulator delivery, then activates eligible portal access.

## Trust boundary

`portalPublicProcedure` clears staff auth. Portal authorization uses a validated portal session or compatibility access token and `requirePortalAuthorized`; clients cannot select organization, customer, role, or enabled features. The dashboard and failed claim/OTP paths use `accessUnavailable`/other `PORTAL_PUBLIC_MESSAGES`.

## P2-S3 addition

Invitations and OTPs are hashed at rest, replacements invalidate predecessors, claims are transactional, OTPs have TTL/attempt/cooldown controls, and delivery is emulator-only. Legacy plaintext magic-token migration is documented separately and not applied in S3.

## P2-S7A update (2026-08-02)

- Magic-access hashing: `hashPortalAccessToken` / domain `portal-magic-access` (`portal-magic-access.ts`).
- New credentials hash-only at rest; legacy plaintext dual-read in `COMPATIBILITY` mode only.
- Session path after `__portal_session` uses portal account identity + `sessionVersion` — **not** plaintext magic re-entry.
- Dashboard / staff getAccount / getCustomerPortalAccess no longer expose recoverable raw magic URLs.
- Checkpoint SHA: `472c2479066a9591974588297059e7aec59f1b2e`. See `portal-phase-2-s7a-completion.md`.

## P2-S7B update (2026-08-03)

- Authenticated portal operates on `__portal_session` + `/portal/app/*` (session-first).
- Legacy magic URLs remain compatible as shims only; no full protected app under token path after exchange.
- Emulator HASH_ONLY / plaintext-removal proof and URL/browser redaction evidence are S7B gates (**IN_PROGRESS**).
- Production plaintext removal / production HASH_ONLY: **NOT AUTHORIZED**. Do not start P2-S8.
