# YL-S12 Complete — Customer portal harden

**STATUS:** COMPLETE  
**VERDICT:** PASS  
**Date:** 2026-08-12  

## Scope completed

1. **Null-safe portal labels** — `formatPortalStatusLabel` across portal pages (billing, agreements, jobs, etc.)
2. **Invite → `/portal/app`** — claim success uses `portalInviteSuccessPath()` (session-first home)
3. **HASH_ONLY readiness helpers** — `isPortalAccountHashReady` / `summarizePortalHashReadiness` (no prod mode flip)
4. **Unit tests** for invite path, labels, hash readiness

## Verification

| Check | Result |
|-------|--------|
| Unit `npm test` | **PASS** 269/269 |
| Production deploy | **NONE** |
| Production HASH_ONLY | **NOT flipped** (BACKLOG-004 deferred) |

## Deferred

- BACKLOG-004 prod HASH_ONLY cutover, live OTP/email adapters, billing (YL-S13), files (YL-S15), WCAG matrix

## Next sprint

**NOT AUTHORIZED.**
