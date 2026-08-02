# Portal Phase 2 S4 test plan

**ENVIRONMENT=EMULATOR. NO DEPLOYMENT.**

1. Run both S4 static audits.
2. Run `portal-phase2-s4.integration.test.ts` against the Firestore emulator.
3. Confirm cross-customer and cross-tenant list isolation, generic job-detail denial, DTO field absence, authoritative scope, and public-token separation.
4. Run the broader portal integration suite when the dedicated S4 suite is green.
5. Leave completion command results pending until captured by the owning checkpoint runner.

The suite defines **142 runtime `it` cases** through Vitest parameterization. Deep browser login is intentionally deferred: emulator session/claim setup adds no stronger query-boundary evidence than direct real-helper integration here. Existing E2E retains generic unauthorized-state coverage; no production browser flow is used.
