# Portal Phase 2 S6 — Responsive

**ENVIRONMENT:** EMULATOR

## Scope

No responsive UI changes in S6. Transaction integrity, idempotency, and payment safe mode are backend/API concerns.

## Regression baseline

Existing portal viewport matrix from P2-S5 Playwright config remains the regression baseline:

| Viewport         | Width | Coverage                                |
| ---------------- | ----- | --------------------------------------- |
| mobile-phone     | 390   | Portal routes + `portal-mobile.spec.ts` |
| tablet-portrait  | 768   | Portal routes                           |
| tablet-landscape | 1024  | Portal routes                           |
| desktop          | 1440  | Portal routes                           |

## S6 evidence

Backend mutations are viewport-independent. S6 evidence is unit + integration only:

- `portal-phase2-s6-security.test.ts`
- `portal-phase2-s6.integration.test.ts`

## Non-portal responsive skips

P0.2C Sign Tracker responsive specs (4 of 13 total E2E skips) require staging Auth — **non-portal**, outside S6 scope. Portal launch-critical skipped = **0**.

See `portal-phase-2-s6-skipped-test-review.md`.
