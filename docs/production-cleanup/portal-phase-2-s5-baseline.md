# Portal Phase 2 S5 baseline

**Checkpoint:** PORTAL-P2-S5 Route Authorization and File Access Tickets  
**ENVIRONMENT:** EMULATOR  
**Branch:** `production/yuletide-cleanup-launch-readiness`  
**Baseline SHA:** working tree on `production/yuletide-cleanup-launch-readiness`  
**Production/deploy actions:** none permitted or performed

## Preflight

S5 adds canonical route authorization (`portal-route-access.ts`) and short-lived file access tickets (`portal-file-access.ts`) on top of completed P2-S1 permissions, P2-S2 sessions, and P2-S4 customer-scoped queries and public DTOs.

## Baseline assumptions

- Portal auth resolves server-side from magic token or `__portal_session`; client-supplied `organizationId`, `customerId`, and role are never trusted.
- Feature entitlements come from tenant/creator `enabledFeatures`; disabled features fail closed at API and route layers.
- Customer file reads use signed tickets via `/api/portal/files`; permanent Storage URLs and `/api/files?path=` proxy paths are not returned in public DTOs.
- Direct client Firebase Storage access for portal customers remains denied; staff org users may still read under existing Storage rules.
- Legacy magic-token hash migration remains **deferred**; token URLs are preserved for compatibility.

## S5 closeout work

Route map, feature-route matrix, route authorization design, file map/security, storage architecture note, cache review, test plan, security evidence template, accessibility notes, rollback instructions, static audits (`audit-portal-routes.mjs`, `audit-portal-files.mjs`), and launch-document updates.
