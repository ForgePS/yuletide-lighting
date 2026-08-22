# Data migration plan (Phase 1)

**Status:** Planned — **not executed** in P0.2  
**Safety:** Dry-run default, `--apply` required, rollback snapshots, no production deploy from this phase

## Per-domain checklist

For properties, jobs, conversations/messageThreads, public proposal/invoice mirrors:

1. Select canonical org-scoped path
2. Freeze new legacy writes
3. Compatibility reader + telemetry
4. Idempotent migration script (batch, resume, org filter)
5. Count reconciliation
6. Conflict report (IDs, fields, timestamps, safe-auto flag)
7. Rollback metadata
8. Integration tests
9. Remove compatibility after zero legacy reads

## Conflict report fields

- Canonical record ID / Legacy record ID
- Conflicting fields + values
- Last update timestamps
- Recommended resolution
- Whether automatic migration is safe

## Execution order (proposed)

1. Properties
2. Jobs
3. Conversations
4. Public proposal/invoice mirrors

Module migration (`org-modules-v1`) is separate and must complete before production deploy of fail-closed modules.
