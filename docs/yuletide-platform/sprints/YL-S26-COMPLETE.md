# YL-S26 COMPLETE — Multi-tenant production blockers

**Completed:** 2026-08-21  
**Production deploy:** NO  
**Production Firestore writes:** NO

## Shipped

1. **Stripe safe-mode** — `sk_live` no longer auto-mocks payments; requires `PORTAL_ALLOW_LIVE_PAYMENTS=1`. Emulator / `PORTAL_PAYMENT_SAFE_MODE=1` / missing key still safe.
2. **Twilio uniqueness** — `assertTwilioPhoneUnique` on integration save; inbound resolve returns org only when exactly one match.
3. **Staff invites** — opaque token + hash on `userInvites`; `claimStaffInvite` creates Auth user + `users/{uid}`; `/invite/[token]` UI; settings copy-once invite link.
4. **Crew mobile Auth** — Firebase email/password login, SecureStore token, home gate + sign out.
5. **Messaging honesty** — delivery badges + toasts distinguish recorded-only vs sent; SMS center banner for `REAL_SMS`.

## Ops still required for live multi-tenant

- Set `PORTAL_ALLOW_LIVE_PAYMENTS=1` + Stripe Connect when charging live
- Unique Twilio numbers per tenant + `REAL_SMS` / `REAL_EMAIL` when ready
- Run BACKLOG-005 cross-org probe
- HASH_ONLY portal cutover (BACKLOG-004)
