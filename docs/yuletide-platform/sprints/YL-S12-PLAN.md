# YL-S12 Plan — Customer portal harden

## Objective

HARDEN customer portal (YL-S0 baseline YL-S12): null-safe status/stage labels, invite claim → session-first `/portal/app`, HASH_ONLY readiness helpers (emulator-safe, no prod cutover).

## Authorization

User authorized YL-S12. No production deploy. No production HASH_ONLY flip (BACKLOG-004 deferred).

## Deliverables

1. **Null-safe portal labels** — `formatPortalStatusLabel` across portal pages (no raw `.replace` on null)
2. **Invite → `/portal/app`** — after successful claim, navigate to session-first home
3. **HASH_ONLY readiness helpers + tests** — account hash-ready summary; mode/guard tests (no prod migration)
4. **Unit tests** for label + invite path + hash readiness

## Out of Scope

- Production HASH_ONLY cutover (BACKLOG-004), live OTP/email adapters, billing (YL-S13), files (YL-S15), WCAG matrix, production deploy
