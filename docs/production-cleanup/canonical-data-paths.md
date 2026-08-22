# Canonical Firestore data paths (P0.2 draft)

**Status:** Documentation phase — no production migration applied  
**Sources:** `packages/firebase/src/record-paths.ts`, `docs/production-cleanup/data-path-inventory.md`, live firebase modules

## Canonical rule

Organization-scoped collections under `organizations/{orgId}/…` are preferred. Customer subcollections are legacy compatibility for select entities.

| Entity          | Canonical path                               | Legacy paths                | Write router                        | Compatibility                   |
| --------------- | -------------------------------------------- | --------------------------- | ----------------------------------- | ------------------------------- |
| Customers       | `organizations/{org}/customers/{id}`         | —                           | customer360                         | —                               |
| Contacts        | `organizations/{org}/contacts/{id}`          | —                           | contacts360                         | —                               |
| Properties      | `organizations/{org}/properties/{id}`        | `customers/{id}/properties` | customer360                         | Dual-read/write until migration |
| Consultations   | `organizations/{org}/consultations/{id}`     | —                           | consultations360                    | —                               |
| Designs         | under customer/design flows                  | —                           | customer360                         | Review                          |
| Mockups         | `organizations/{org}/mockups/{id}`           | —                           | mockups360                          | —                               |
| Proposals       | `organizations/{org}/proposals/{id}`         | legacy proposals router     | proposals360                        | Compat reader                   |
| Agreements      | `organizations/{org}/agreements/{id}`        | —                           | agreements360                       | —                               |
| Jobs            | `organizations/{org}/jobs/{id}`              | `customers/{id}/jobs`       | schedule360 / customer360 / jobs360 | Dual-read/write                 |
| Invoices        | `organizations/{org}/invoices/{id}`          | legacy invoices router      | invoices360                         | Compat                          |
| Payments        | invoice subcollection / payments             | —                           | invoices360                         | —                               |
| Conversations   | `organizations/{org}/conversations/{id}`     | `messageThreads`            | messages360                         | Legacy migrate-on-list          |
| Messages        | `…/conversations/{id}/messages`              | legacy messages             | messages360                         | —                               |
| Notifications   | org notifications                            | —                           | messages360 / portal                | —                               |
| Inventory       | org inventory collections                    | —                           | inventory360                        | —                               |
| Storage         | seasonal storage                             | —                           | storage360                          | —                               |
| Signs           | `organizations/{org}/signLocations/{id}`     | field routes redirected     | signTracker360                      | —                               |
| Tasks           | automation / tasks                           | —                           | automation360                       | —                               |
| Automation      | automation rules                             | —                           | automation360                       | —                               |
| Configuration   | `settings/*`, org root modules               | —                           | settings360 / creator360            | Config registry foundation      |
| Roles           | `organizations/{org}/roles/{id}`             | —                           | settings360                         | —                               |
| Audit logs      | org audit collections                        | —                           | various                             | —                               |
| Portal accounts | `portalAccounts` / `portalUsers` / QR        | —                           | portal360                           | —                               |
| Public tokens   | `publicProposals` / `publicInvoices` mirrors | —                           | public procedures                   | Server-only client deny         |

## Removal criteria (per entity)

1. Zero legacy writes for 14 days
2. Zero legacy read telemetry
3. Count reconciliation clean
4. Conflict report empty or resolved
5. Integration tests green
6. Explicit removal PR
