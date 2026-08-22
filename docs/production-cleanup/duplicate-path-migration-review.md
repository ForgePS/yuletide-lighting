# Duplicate-path migration review (P0.2B → P0.2C)

**Status:** Write freezes remain active; **no duplicate-path data migration applied in P0.2C**  
**Commit base:** `cb20b419e2382bc9bb85a0f91c78fdd1658d6f1d`+

## Write freezes (code)

| Domain                 | Canonical writer                     | Legacy reader         | Legacy writer                                                  | Compatibility metrics       | Cross-path detector                 | Migration script            | Rollback           | Tests              |
| ---------------------- | ------------------------------------ | --------------------- | -------------------------------------------------------------- | --------------------------- | ----------------------------------- | --------------------------- | ------------------ | ------------------ |
| Properties             | `createOrgProperty`                  | may still read legacy | denied / redirected via `createCustomerProperty360` → org-only | `emitLegacyPathDeprecation` | static audit                        | planned, not applied        | pre-image required | integration + gate |
| Jobs                   | `createOrgJob`                       | may still read legacy | denied / redirected via `createCustomerJob` → org-only         | same                        | static audit                        | planned, not applied        | pre-image required | integration + gate |
| Conversations/messages | conversations helpers                | flat paths deprecated | dual-write removed; `messagesRouter` redirected                | same                        | static audit                        | planned, not applied        | pre-image required | integration + gate |
| Proposals              | `createProposal360` (org collection) | org-only              | no legacy dual-write                                           | n/a                         | extend gate if dual-write reappears | none needed for path freeze | n/a                | unit/integration   |
| Invoices               | `createInvoice360` (org collection)  | org-only              | no legacy dual-write                                           | n/a                         | extend gate if dual-write reappears | none needed for path freeze | n/a                | unit/integration   |

## Production gate

`node scripts/audit-legacy-writes.mjs` is wired into `production:check` and **fails** if forbidden legacy write patterns are reintroduced for properties/jobs/messages.

## P0.2C confirmation

- Duplicate-path **data** migrations were **not** applied.
- Write freezes remain active for properties, jobs, conversations/messages.
- Proposals and invoices remain org-collection canonical writers (no dual-write freeze work required beyond monitoring).
