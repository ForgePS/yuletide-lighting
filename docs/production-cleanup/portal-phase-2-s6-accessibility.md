# Portal Phase 2 S6 — Accessibility

**ENVIRONMENT:** EMULATOR

## Scope

S6 is backend mutation hardening (transaction integrity, idempotency, provider-safe payments). **No new portal UI surfaces** were introduced.

## Regression baseline

Accessibility evidence defers to P2-S5 and existing portal Playwright checks:

| Check                               | Source                             |
| ----------------------------------- | ---------------------------------- |
| Heading hierarchy                   | Portal Playwright specs            |
| Focusable controls on portal routes | Portal Playwright specs            |
| Route-denied neutral screens        | P2-S5 — no sensitive content flash |
| Viewport matrix (390/768/1024/1440) | P2-S5 responsive evidence          |

## S6-specific UI impact

| Change                                      | A11y impact                                                                          |
| ------------------------------------------- | ------------------------------------------------------------------------------------ |
| Checkout safe mode (`/api/stripe/checkout`) | API-only; no checkout UI change required for emulator                                |
| Mutation error messages                     | Existing portal error patterns preserved ("no longer available", rate limit message) |
| Idempotency (transparent to user)           | No UI change — duplicate submits return same result                                  |

## Expectation

Route-denied states remain neutral unavailable screens (no sensitive content flash) per P2-S5. Stale-page enforcement (role downgrade, feature disable, suspension) produces existing auth denial UX — verified in integration, not new components.

## E2E

Portal emulator specs: **39/39 passed, 0 skipped** (S5 baseline). S6 does not add portal E2E specs; regression via existing `playwright.portal-emulator.config.ts`.
