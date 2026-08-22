# Portal Phase 2 S5 rollback

**ENVIRONMENT=EMULATOR.**

S5 introduces route authorization helpers, file access tickets, static audits, tests, and documentation. It performs no migration or production write.

## Rollback principles

- **Security fixes stay.** Do not revert ticket-based file access or route fail-closed behavior once validated.
- **UI may roll back.** Nav filtering or fallback copy can revert independently if UX regressions appear.
- **Do not restore** permanent Storage URLs or staff `/api/files?path=` in portal public DTOs.

## If regression is found

1. Stop the checkpoint; do not deploy.
2. Identify layer: route resolver, ticket issuer, API stream, or UI frame.
3. Revert the specific UI change while keeping `createPortalFileAccess` and `/api/portal/files` if the regression is cosmetic.
4. If ticket verification fails broadly, fix forward — do not bypass with raw Storage paths.
5. Re-run S5 static audits and integration suite.
6. Record exception in defect register before review.

## Data rollback

Not applicable — no production data touched.

## Compatibility

Magic token URLs and `customers.portalToken` dual-write remain unchanged. S5 does not alter the deferred magic-token hardening plan.
