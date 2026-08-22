# Portal Phase 2 S4 baseline

**Checkpoint:** PORTAL-P2-S4  
**ENVIRONMENT:** EMULATOR  
**Branch:** `production/yuletide-cleanup-launch-readiness`  
**Production/deploy actions:** none permitted or performed

## Baseline

- Canonical scope is resolved server-side from the portal token/session.
- Customer-owned portal reads use `customerId` equality queries.
- `colListByCustomerId` fails closed and has no organization-scan fallback.
- Job detail rejects missing, cross-customer, and cross-tenant IDs with generic `PORTAL_RESOURCE_NOT_FOUND`.
- Public customer and resource DTOs are explicit allowlists.
- `/pay` invoice tokens and `/p` proposal tokens remain separate public-token authorities; the portal does not infer access from a job ID.

## S4 closeout work

Static query-scope and public-DTO gates, emulator integration coverage, query/DTO maps, fallback and ownership records, evidence templates, rollback instructions, and launch-document updates.
