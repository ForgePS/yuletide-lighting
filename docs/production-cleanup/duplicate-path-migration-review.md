# Duplicate-path migration review (P0.2B)

**Status:** Write freezes implemented; **no production record migration applied**  
**Commit base:** `cb20b419e2382bc9bb85a0f91c78fdd1658d6f1d`+

## Write freezes (code)

| Domain               | Legacy writer                                       | Canonical behavior now                                                     |
| -------------------- | --------------------------------------------------- | -------------------------------------------------------------------------- |
| Properties           | `createCustomerProperty360` dual-write              | Writes **only** via `createOrgProperty`                                    |
| Jobs                 | `createCustomerJob` subcollection                   | Writes **only** via `createOrgJob`                                         |
| Conversations        | `messagesRouter` `messageThreads` / flat `messages` | Delegates to `listConversations` / `ensureConversation` / `sendMessage360` |
| Messages dual-write  | `sendMessage360` flat `messages`                    | Removed                                                                    |
| Proposals / Invoices | Already org-collection                              | Keep sole helpers                                                          |

Deprecation metrics: `emitLegacyPathDeprecation` (dev warn + optional sanitized debug).

Static gate: `node scripts/audit-legacy-writes.mjs` (wired into `production:check`).

## Migration tooling (not applied)

Scripts still required per domain (audit / dry-run / apply-protected / rollback / conflicts / reconciliation) — tracked in `data-migration-plan.md`. **Do not migrate production records in P0.2B.**

## Conflicts

None evaluated yet (no data migration run).
