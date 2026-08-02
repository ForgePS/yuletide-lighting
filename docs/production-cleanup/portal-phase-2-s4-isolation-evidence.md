# Portal Phase 2 S4 isolation evidence

**ENVIRONMENT=EMULATOR.**

The S4 integration fixture creates A1 and A2 in one tenant and B1 in another, poisons every source record with distinct markers, and verifies:

- A1 lists include A1 but exclude A2 and B1 invoices, proposals, jobs, properties, documents, contacts, messages, notifications, and calendar rows.
- A1 cannot load A2/B1 jobs by ID; unknown IDs produce the same generic not-found.
- Client-injected organization/customer fields do not alter server-derived authorization scope.
- A1 never receives A2/B1 invoice payment tokens or proposal signing tokens.

Integration result: **PENDING**
