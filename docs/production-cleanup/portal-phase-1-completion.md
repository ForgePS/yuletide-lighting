# Customer Portal — Phase 1 Foundation completion

**Date:** 2026-07-31  
**Status:** Implemented in codebase (verify + harden pass)

## Delivered

| Plan item                                                     | Status                                                               |
| ------------------------------------------------------------- | -------------------------------------------------------------------- |
| PortalAccount / PortalUser / Timeline / Notification types    | Done (`packages/types/src/portal.ts`)                                |
| Creator `customer_portal` + child feature keys                | Done (`creator.ts`, validators)                                      |
| `portal360` account CRUD + dual-write `customers.portalToken` | Done (`ensurePortalAccount`, enable/revoke/rotate/suspend)           |
| Backfill                                                      | Done (`backfillPortalAccountsForOrg` + `portal360.backfillAccounts`) |
| Sanitized dashboard DTOs + customer-scoped queries            | Done (+ calendarEvents customer-scoped)                              |
| Property ownership on service/schedule requests               | Done                                                                 |
| Staff CRM portal card                                         | Done (`CustomerPortalCard`)                                          |
| Separate `PortalShell` + feature-gated nav                    | Done                                                                 |
| Creator entitlements UI + tenant portal settings              | Done (`creator-console`, `CustomerPortalSettingsPage`)               |
| Firestore rules + indexes                                     | In repo (`firestore.rules`, `firestore.indexes.json`)                |

## Deploy note

Production/staging Firebase **deploy is not authorized** by the current program gate. Rules and indexes are committed for the next authorized deploy. Emulator rules tests cover `portalAccounts` staff access. Smoke-test live token portals after that deploy.

## Tests

- `packages/types/src/portal.test.ts`
- `packages/firebase/src/portal360.test.ts`
