# Portal Phase 2 S4 — Completion Record

**PHASE:** PORTAL-P2-S4 Customer-Scoped Query Cutover and Public DTO Hardening  
**STATUS:** COMPLETE  
**DATE:** 2026-08-01  
**BRANCH:** `production/yuletide-cleanup-launch-readiness`  
**COMMIT SHA:** (working tree; base `c0cae35a23f96cf3dc08c6f98842c04777775853`)  
**ENVIRONMENT:** EMULATOR  
**Deployment:** NO  
**Production writes:** 0

## QUERY INVENTORY

- Procedures reviewed: 33+ public portal360 (+ auth)
- SAFE_CANONICAL: majority after cutover (customer `where` at query layer)
- SAFE_WITH_COMPATIBILITY: magic-token dual-read / QR legacy token dual-read (documented; not broadened)
- REQUIRES_REMEDIATION: 0 remaining in portal customer-owned list paths
- BLOCKER: 0

## CUSTOMER SCOPING

- Dashboard / Schedule / Service requests / Messages / Notifications / Contacts / Properties / Proposals / Agreements / Invoices / Jobs / Documents / Mockups / Storage / Consultations / Reviews / Rebooking / Timeline: PASS (customer-scoped queries)
- Payments / Signing: portal lists scoped; high-impact public-token routes remain separate compatibility surfaces (documented; not magic-token migration)

## LEGACY FALLBACKS

- Total found: org-scan-on-index-miss (removed), staff list helpers used by portal (replaced)
- Removed: portal `colListByCustomerId` org fallback; notification/timeline/calendar/contacts/agreements/docs/storage/reviews/rebook org scans
- Safe temporary: magic-token customer.portalToken dual-read (S3 deferred migration)
- Require migration: legacy plaintext magic tokens
- Unsafe remaining: 0 in portal customer-owned paths

## OWNERSHIP

- Canonical ownership helper: PASS — `portal-ownership.ts`
- Direct-ID validation: PASS — jobDetail (+ notification mark-read)
- Nested ownership: PASS — property under job; storage detail customer check
- Missing / ambiguous ownership: FAIL CLOSED

## ISOLATION

- Same-tenant cross-customer / cross-tenant / record-ID injection: PASS (S4 suite 142 + prior suites)
- Payment/signing/proposal approval via portal ID injection: denied or out-of-band public-token (documented)
- Document / message isolation: PASS

## PUBLIC DTOs

- Allowlisted mappers: PASS (`toPublicCustomer`, mapPortal\*, list mappers)
- Raw Firestore responses remaining in portal public paths: 0 (audit PASS)
- Internal notes / cost/margin / security metadata / unknown-field leakage: absent from public DTOs (tests)

## FIRESTORE

- Index changes: none required for single-field `customerId` equality
- Rules changes: none required beyond existing portal denies
- Rules deployed: NO

## STATIC AUDITS

- portal-permissions / sessions / auth-security / query-scope / public-dtos: PASS

## TEST RESULTS

- Format: PASS (batched format-changed for Windows CLI limits)
- Lint: PASS (pre-existing warnings)
- Typecheck: PASS
- Unit: PASS — 187
- Integration portal: PASS — 303 (87 + 74 S3 + 142 S4)
- Firebase rules: PASS — 15
- E2E: PASS — 20 (portal emulator config)
- Build: PASS
- production:check 1: PASS
- production:check 2: PASS
- production:check 3: PASS

## DEFECTS

- P0: 0
- P1: 0
- P2: 0

## DEFERRED

- Legacy magic-token hash migration
- Token URL final cutover
- Real nonproduction Firebase validation
- Production deployment
- PORTAL-P2-S5 (not started)

## PRODUCTION WRITES

0

## DEPLOYMENT PERFORMED

NO

## DEPLOYMENT AUTHORIZED

NO

## RECOMMENDATION

**PROCEED TO PORTAL-P2-S5**

Do not begin S5 automatically — await program authorization.
