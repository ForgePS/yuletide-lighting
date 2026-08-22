# Customer Portal Phase 2 deployment plan

**ENVIRONMENT=EMULATOR**  
**Mode:** PREPARE-ONLY  
**Decision:** DO NOT DEPLOY

No `yuletide-lighting-staging` or other staging project is assumed. This work must not create a Firebase project, write production data, deploy web code, deploy rules/indexes, send real invitations, or apply a migration.

## Emulator-first readiness sequence

1. Freeze the intended commit and archive secret-free test output.
2. Pass unit, integration, Firestore rules, API, Playwright, accessibility, and responsive gates against local emulators.
3. Close P1 defects and document accepted P2 limitations.
4. Review token/session cutover, compatibility rollback, indexes/rules, backup, monitoring, and support procedures.
5. Reconcile an explicitly approved non-production environment only if one is provided by an authorized owner.
6. Produce a change set, rollback plan, approvers, and maintenance/customer communication plan.
7. Obtain separate written authorization before any deploy or data write.

## Stop conditions

Stop for an unknown project ID, missing backup/rollback, real customer fixtures, unredacted secrets, failed isolation/rules tests, incomplete session authorization, or absent approval.

This document is not deployment approval. **NO DEPLOYMENT.**
