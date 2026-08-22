# YL-S26 PLAN — Multi-tenant production blockers

**Authorized:** 2026-08-21  
**Goal:** Close P0 product blockers for multi-tenant production readiness (code path).

## In scope

1. Stripe `portalPaymentSafeMode` — `sk_live` requires `PORTAL_ALLOW_LIVE_PAYMENTS=1`
2. Twilio unique phone on save + fail-closed multi-match inbound
3. Staff invite token + claim (Auth + `users/{uid}`) + `/invite/[token]`
4. Crew mobile Firebase Auth sign-in
5. Messaging UI honesty for recorded vs sent

## Out of scope

- Live cross-org probe (BACKLOG-005)
- HASH_ONLY portal cutover (BACKLOG-004)
- Rules PermissionMatrix rewrite / Storage settingsRole
- Flipping `REAL_SMS` / `REAL_EMAIL` in CI or prod env
