# YL-S23 Plan — Full lifecycle smoke (BACKLOG-006)

## Objective

HARDEN in-repo **full lifecycle smoke** for lead → proposal → pay → job → removal → renewal: expand pure helpers + a cohesive Vitest smoke that asserts the chain without Admin SDK / production writes. Staging/prod live UAT remains a deferred ops checklist.

## Authorization

User authorized YL-S23. No production deploy. No production Firestore writes.

## Deliverables

1. **Lifecycle chain pure helpers** — deposit cents, public paths (YL-S22 gated), appointment→job stage, rebooking eligibility, in-memory hop advance
2. **Cohesive `lifecycle.smoke.test.ts`** — full BACKLOG-006 chain using acceptance/invoice/job/token helpers
3. **Wire shared appointment maps** into jobs360 + schedule360 (no drift)
4. **Deferred staging/prod checklist** documented
5. **Sprint docs** + BACKLOG-006 PARTIAL

## Out of Scope

- Production deploy / prod writes
- Live Stripe / Twilio / authenticated Playwright lifecycle E2E
- YL-S17 rebooking product sprint
- HASH_ONLY / cross-org prod probe
