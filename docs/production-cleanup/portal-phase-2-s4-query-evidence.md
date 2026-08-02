# Portal Phase 2 S4 query evidence

**ENVIRONMENT=EMULATOR. NO PRODUCTION QUERIES.**

Evidence commands:

- `npm run audit:portal-query-scope`
- `firebase emulators:exec --only firestore --project yuletide-rules-test "npx vitest run tests/integration/portal/portal-phase2-s4.integration.test.ts"`

Expected: static audit passes only when customer-owned portal lists contain no `colList<T>` organization fallback, the canonical helper has a `customerId` equality query, notification bulk updates use `portalUserId`, and dashboard calendar remains customer-scoped.

Command result: **PENDING**
