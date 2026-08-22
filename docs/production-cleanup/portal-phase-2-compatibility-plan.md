# Customer Portal Phase 2 compatibility plan

**ENVIRONMENT=EMULATOR**

## Current contract

- Canonical token: `portalAccounts.accessToken`.
- Legacy compatibility token: `customers.portalToken`.
- Enablement and rotation dual-write both fields.
- Access resolution checks canonical portal accounts first, then legacy customers.
- `establishPortalSessionFromAccessToken` accepts either path and upgrades access into `__portal_session`.

## Removal criteria

Remove `customers.portalToken` only after:

1. Every enabled customer has one valid canonical portal account and primary portal user.
2. Backfill and reconciliation are repeatable and pass against emulator fixtures.
3. All portal entry routes establish a dedicated session.
4. Public procedures authorize from session context and canonical permissions.
5. Old token links have a documented expiry/redirect/support policy.
6. Metrics show no legacy fallback use for the agreed observation window.
7. Rules/index deployment, rollback, backup, and customer communication are separately approved.

## Prepare-only migration sequence

Inventory and dry-run; reconcile discrepancies; switch reads to canonical/session-first; observe fallback; stop dual-write; then remove the legacy field in a later authorized migration. Each step needs rollback criteria.

**NO PRODUCTION MIGRATION APPLY. NO DEPLOYMENT.** This plan does not assume or create a staging project. All current evidence is `ENVIRONMENT=EMULATOR`.
