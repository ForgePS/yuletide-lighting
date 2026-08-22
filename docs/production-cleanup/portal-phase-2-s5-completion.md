# Portal Phase 2 S5 — Completion Record

**PHASE:** PORTAL-P2-S5 Route Authorization, Feature Entitlement Cutover, and Portal File Security  
**STATUS:** COMPLETE  
**DATE:** 2026-08-02  
**BRANCH:** `production/yuletide-cleanup-launch-readiness`  
**COMMIT SHA:** `c0cae35a23f96cf3dc08c6f98842c04777775853` (`git rev-parse HEAD`; working tree includes uncommitted S5 implementation)  
**ENVIRONMENT:** EMULATOR  
**Deployment:** NO  
**Production writes:** 0

## ROUTES

- Total reviewed: 25+ portal app routes under `apps/web/src/app/portal`
- Public entry: 4 (`/portal`, `/portal/login`, `/portal/access/*`, `/portal/invite/*`)
- Authenticated: 3 (`home`, `notifications`, `contacts`)
- Feature protected: 17 segments via `PORTAL_ROUTE_DEFINITIONS`
- Resource protected: 1 (`jobs/[jobId]`)
- Canonical route guards: `requirePortalRouteAccess` + `authorizePortalPath` + `/api/portal/authorize-route` + `PortalAuthedFrame`
- Missing guards: 0 (home uses dashboard API; audited allowlist)
- Unauthorized-content flash findings: 0 (route auth resolves before dashboard data; denied shows neutral unavailable screen)

## FEATURE ENTITLEMENTS

- Features mapped: dashboard, scheduling, service_requests, messaging, e_sign, billing, proposals, agreements, properties, mockups, documents, install_tracking, takedowns, storage, consultations, reviews, rebooking (+ notifications/contacts as authenticated)
- Navigation gating: PortalShell feature filter (UX only)
- Direct-route gating: yes (authorize-route + AuthedFrame)
- API gating: yes (P2-S1 `requirePortalAuthorized` preserved)
- Missing-config behavior: fail closed; explicit `enabledFeatures` authoritative (newly-shipped soft-enable only when no explicit list)
- Feature-disable session behavior: subsequent route/API/file access denied after settings update

## ROLE ENFORCEMENT

- account_owner / authorized_contact / billing_contact / property_contact / view_only: via existing P2-S1 matrix
- Role change invalidation: `changePortalUserRole` invalidates sessions; S5 integration asserts view_only cannot create service requests / pay

## SESSION

- Session preferred: `__portal_session` (P2-S2 preserved)
- Token compatibility: magic token URL preserved
- Scope conflict: S2 deny preserved
- Suspended account: route/API/file denied
- Revoked user: denied via existing account/user checks
- Logout/back-button behavior: denied routes do not load protected dashboard data after auth denial

## FILES

- File types reviewed: documents, agreement PDFs, message attachments, mockups, property gallery, job photos, service-request uploads
- Customer-visible: ticketed via `createPortalFileAccess`
- Staff-only / unknown classification: DENY
- Canonical file helper: `createPortalFileAccess` / `verifyPortalFileTicket` / `readPortalFileFromTicket`
- Ownership + parent-resource validation: yes where parent supplied
- Signed URL TTL: 15 minutes (`portalSecurity.fileAccessTtlMinutes`)
- Permanent-public files: not issued by portal ticket path

## STORAGE

- Direct client access: staff-only (`isStaffRole` + `hasUserDoc`); portal customers denied
- Same-customer / cross-customer / cross-tenant / staff-only / suspended: covered by ticket + rules tests
- Rules deployed: NO

## UPLOADS

- Existing flow: `uploadPortalPhoto` (service requests)
- MIME allowlist: jpeg/png/webp
- Size: `maxUploadBytes` (default 4.5MB)
- Filename sanitation + path traversal prevention: yes
- Client-selected path: ignored (server-derived `portal-service/{customerId}`)

## CACHE SECURITY

- Customer route caching: dynamic client portal; file API `Cache-Control: private, no-store`
- Service-worker: NOT APPLICABLE

## STATIC AUDITS

- portal-permissions / sessions / auth-security / query-scope / public-dtos: PASS
- portal-routes: PASS (21 protected pages)
- portal-files: PASS

## TEST RESULTS

- Format: PASS
- Lint: PASS (pre-existing jsx-a11y warnings)
- Typecheck: PASS
- Unit: PASS — 195
- Integration: PASS — 428 (portal S5: 54; prior portal S1–S4: 303)
- Firebase rules: PASS — 18
- E2E: PASS — 48 passed, 13 skipped (portal specs 39/39) ENVIRONMENT=EMULATOR
- Responsive / Accessibility: covered in portal Playwright viewport + heading checks
- Build: PASS
- production:check 1: PASS
- production:check 2: PASS
- production:check 3: PASS

## DEFECTS

- P0: 0
- P1: 0
- P2: 0
- Corrected: invalid-token AuthedFrame flash/500 (route-auth-first); explicit feature-list authority; Storage staff-role hardening
- Remaining: 0 for S5 scope

## DEFERRED

- Legacy magic-token hash migration
- Token URL final cutover
- Real nonproduction Firebase validation
- Firebase rules/index deploy
- Production deployment

## PRODUCTION WRITES

0

## DEPLOYMENT PERFORMED

NO

## DEPLOYMENT AUTHORIZED

NO

## RECOMMENDATION

**PROCEED TO PORTAL-P2-S6** when program authorizes — do not deploy automatically.
