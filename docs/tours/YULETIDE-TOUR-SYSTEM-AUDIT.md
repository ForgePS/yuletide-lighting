# Yuletide Tour System — Repository Audit (YT-TOUR-S0)

**Program:** YT-TOUR  
**Checkpoint:** YT-TOUR-S0  
**Date:** 2026-08-22  
**Branch:** `main`  
**SHA:** `fcc4a29dad52a4b3fff5fc34a82fd2190573d128`  
**Auditor:** Cursor (directive §4)

---

## 1. Application stack

| Area | Finding |
|------|---------|
| **Monorepo** | npm workspaces + Turborepo (`package.json` root) |
| **Package manager** | npm `10.9.2` |
| **Node** | engines `22` (`.nvmrc`, root `package.json`) |
| **Web app** | Next.js `15.1.3`, React `19`, TypeScript `5.7` / web `6.0.3` |
| **Mobile** | Expo / React Native (`apps/mobile`) — crew field app |
| **UI** | Tailwind CSS, `@clcrm/ui`, Lucide icons, Sneat-inspired tokens |
| **API** | tRPC v11 (`@trpc/*`) via `apps/web/src/app/api/trpc/[trpc]/route.ts` |
| **Validation** | Zod (`@clcrm/validators`) |
| **Database** | Firebase Firestore (primary); `@clcrm/db` Postgres/Drizzle legacy (still in workspace, not primary path) |
| **Auth** | Firebase Auth (client) + Admin SDK (server); `__session` cookie for middleware |
| **Storage** | Firebase Storage |
| **Background jobs** | Inngest (`apps/web/src/lib/inngest/`, `/api/inngest`) |
| **Hosting** | Firebase Hosting + Next.js SSR (`frameworksBackend`, `firebase.json`) |
| **Firebase projects** | `yuletide-lighting` (production), `yuletide-lighting-staging` (`.firebaserc`) |
| **Deploy** | `scripts/deploy-firebase.mjs` — project alias, per-env service account, ships `PLATFORM_CREATOR_EMAILS` |

### Frontend structure (`apps/web`)

- **App Router** (`apps/web/src/app/`)
  - `(marketing)/` — public marketing site (home, pricing, services, for-installers)
  - `(auth)/` — sign-in, sign-up, forgot-password
  - `app/` — authenticated staff CRM shell
  - `creator/` — platform Creator console
  - `portal/` — customer portal (session-first `/portal/app/*` + legacy magic-token entry)
  - Public token routes: `/a/`, `/p/`, `/pay/`, `/review/`, `/m/`
  - `onboarding/` — post-signup org checklist
- **Components** — `apps/web/src/components/` (domain-grouped)
- **Shared libs** — `apps/web/src/lib/` (auth, trpc, firebase, cms-runtime, etc.)

### Backend structure

- **`packages/firebase`** — Firestore CRUD, business logic (`*360.ts` modules)
- **`packages/api`** — tRPC routers (`packages/api/src/routers/`)
- **`packages/types`** — shared types, permissions, CRM nav config
- **No separate Cloud Functions app** for CRM API — logic runs in Next.js SSR + tRPC route handler

### Existing tour / demo infrastructure

| Item | Status |
|------|--------|
| Tour provider / registry | **NOT PRESENT** |
| Demo mode flag / banner | **NOT PRESENT** |
| Demo tenant seed / reset | **NOT PRESENT** (staging verification tenant exists separately — see §6) |
| Guided tour UI library (e.g. driver.js) | **NOT PRESENT** in dependencies |
| `/demo` route | **NOT PRESENT** |
| Help & Tours menu | **NOT PRESENT** |

---

## 2. Authentication & authorization

### Sign-in routes

| Route | Purpose |
|-------|---------|
| `/sign-in` | Staff Firebase email/password (`apps/web/src/app/(auth)/sign-in/page.tsx`) |
| `/sign-up` | New org signup → redirects to `/onboarding` |
| `/onboarding` | Org setup checklist (`onboarding360` tRPC) |
| `/portal/login` | Customer portal entry |
| `/portal/access/[token]` | Magic-link portal access |
| `/creator` | Platform Creator console (allowlist-gated) |

### Session behavior

- Client: `FirebaseAuthProvider` (`apps/web/src/lib/firebase-auth.tsx`) — Firebase `onIdTokenChanged`
- Cookie: `__session` (`AUTH_COOKIE_NAME` in `auth-token.ts`) — middleware gate for `/app`, `/creator`
- Server session API: `POST /api/auth/session` establishes HttpOnly cookie
- Portal: `__portal_session` cookie — separate from staff auth (`PORTAL_SESSION_COOKIE`)

### User / tenant model

- **Firestore** `users` collection — `organizationId`, `role` (legacy), `settingsRole` (11-role matrix), `status`
- **Organizations** — `organizations` collection; module entitlements, subscription state, `slug`
- **Tenant resolution** — `createAuthContext()` in `apps/web/src/lib/auth.ts` from Firebase ID token → user doc → org access evaluation
- **Authorization** — `permissionProcedure`, `officeProcedure`, `adminProcedure`, `creatorProcedure` (`packages/api/src/trpc.ts`)
- **Permissions** — `PermissionMatrix` on user; `hasPermission()` from `@clcrm/types`
- **Module gating** — `requireModule()` + `crm-ui-config` nav items filtered by `enabledModules`

### Roles (settings)

`owner`, `admin`, `sales`, `operations`, `installer`, `crew_leader`, `warehouse_staff`, `accounting`, `marketing`, `readonly`, `sign_manager`, `sign_viewer` (see `packages/types/src/permissions.ts`)

---

## 3. Lifecycle capability matrix

Maps directive lifecycle stages to **actual** repository surfaces.  
**Demo Ready** = feature exists and could be shown manually today; **does not** imply tour wiring or demo isolation (none exists yet).

| Capability | Route(s) | Primary component(s) | Data / service layer | Demo ready |
|------------|----------|----------------------|----------------------|------------|
| **Dashboard** | `/app` | `SeasonalCommandCenter` | `reports360`, dashboard queries | **Partial** — works; no demo isolation |
| **Leads** | `/app/pipeline` | `PipelineBoard`, `PipelineCustomerPanel` | `customer360.getPipeline`, `updatePipelineCustomer` | **Yes** |
| **Customers** | `/app/customers`, `/app/customers/[id]/*` | `CustomerList`, Customer 360 tabs | `customer360` router + `packages/firebase/src/customer360.ts` | **Yes** |
| **Properties** | `/app/properties`, customer property tabs | Property managers | `customer360` properties, `properties` router | **Yes** |
| **Estimates** | `/app/customers/[customerId]/consultations` | Consultations page | `consultations360` via `customer360` | **Partial** — consultations serve estimate/survey role; no standalone `/app/estimates` |
| **Proposals** | `/app/proposals`, `/app/proposals/new`, `/app/proposals/[id]` | `ProposalForm`, templates | `proposals360` + legacy `proposals` router | **Yes** |
| **Approval** | `/p/[token]`, `/app/proposals/[id]/present` | Public proposal + present views | `proposals360.public`, `recordPublicApproval` | **Yes** (public token flow) |
| **Deposit / Payments** | `/pay/[token]`, `/app/invoices/*` | Invoice managers, pay page | `invoices360`, Stripe routes (`PORTAL_PAYMENT_SAFE_MODE`) | **Partial** — safe-mode blocks live charges unless authorized |
| **Jobs** | `/app/jobs` | `JobCard`, job pipeline UI | `jobs` router (`jobs.pipeline`, `completeInstall`, `markRemovalComplete`) | **Yes** |
| **Scheduling** | `/app/schedule`, `/app/schedule/calendar`, `/app/schedule/dispatch` | `schedule-managers`, calendar | `schedule360` | **Yes** |
| **Crews** | `/app/crew`, `/app/schedule/crews`, `/app/field/*` | `crew-manager`, `FieldShell`, mobile app | `crew360`, `schedule360.crews`, `crew` mobile router | **Partial** — `/app/field` route validation currently failing in `production:check` |
| **Installation** | `/app/jobs` (complete install), `/app/crew/jobs/[jobId]` | Job detail, crew views | `jobs.completeInstall`, `crew360` | **Yes** |
| **Service** | `/app/service-issues` | `service-issues-page` | `serviceIssues360` | **Yes** |
| **Takedown** | Jobs `markRemovalComplete`; portal `/portal/app/takedowns` | Portal takedowns page | `jobs`, `portal360` | **Partial** — no dedicated staff `/app/takedowns`; takedown via job completion + portal |
| **Storage** | `/app/storage`, customer storage tab | `storage-inventory` | `storage360` | **Yes** |
| **Renewals** | `/app/rebooking`, `/app/rebooking/campaigns/[id]` | `RebookingDashboard` | `rebooking360` | **Yes** |
| **Reports** | `/app/reports/*` | Reports managers | `reports360` | **Yes** |
| **Agreements / E-sign** | `/app/agreements`, `/a/[token]` | Agreements list, public sign | `agreements360` | **Yes** |
| **Mockups** | `/app/mockups/[mockupId]` | `MockupStudio` | `mockups360` | **Yes** (recent save-layer fix on `main`) |
| **Messages** | `/app/messages/*` | `UnifiedInbox`, SMS center | `messages360` | **Partial** — outbound SMS/email honesty UI; live send requires provider config |
| **Website CMS** | `/creator/website`, public `/[slug]` | `website-cms-console`, `CmsPageView` | `websiteCms`, `siteCms` | **Yes** (Creator-only today) |
| **Customer portal** | `/portal/app/*` | Portal page components | `portal360` | **Yes** (session-first; legacy token compat) |
| **Sign tracker** | `/app/marketing/sign-tracker/*` | Sign tracker maps | `signTracker360` | **Yes** |

### Lifecycle automation (acceptance → job chain)

Documented in `packages/firebase` lifecycle helpers and integration tests (`lifecycle.smoke.test.ts`). Full live UAT path (lead → renewal) **not** recorded as a single production suite — see `docs/production-launch-checklist.md`.

---

## 4. tRPC router inventory (relevant to tours)

Primary `appRouter` (`packages/api/src/routers/firestore.ts`):

`customer360`, `proposals360`, `invoices360`, `schedule360`, `jobs`, `crew360`, `storage360`, `rebooking360`, `serviceIssues360`, `onboarding360`, `portal360`, `mockups360`, `messages360`, `reports360`, `websiteCms`, `siteCms`, `creator360`, `settings360`, `automation360`, `reviews360`, `signTracker360`, …

Legacy parallel routers (`customers`, `proposals`, `invoices`, etc.) still mounted — tours should prefer `*360` surfaces where UI already does.

---

## 5. Staging / verification tenant (tour precursor)

**NOT a demo tour tenant**, but closest existing pattern:

| Item | Value |
|------|-------|
| Script | `scripts/provision-staging-verification.ts` |
| Slug | `yuletide-staging-verification` (`scripts/lib/staging-guard.mjs`) |
| Project | `yuletide-lighting-staging` only (production rejected) |
| Seed | `scripts/seed-staging-verification.ts` |
| Cleanup | `scripts/cleanup-staging-verification.ts` |
| State files | `secrets/staging-verification-state.json`, `staging-verification-credentials.json` (gitignored) |

**Implication for YT-TOUR-S2:** Reuse provisioning patterns; do **not** conflate staging verification with sales demo tenant without explicit isolation flags.

---

## 6. Demo safety controls (existing)

| Integration | Current guard |
|-------------|---------------|
| Stripe | `PORTAL_PAYMENT_SAFE_MODE`, `PORTAL_ALLOW_LIVE_PAYMENTS`; `sk_live` blocked without explicit flag (YL-S26) |
| SMS / Email | Provider send gated; honesty UI in messaging managers |
| Portal | Session isolation, org-scoped queries (Phase 2 hardening) |
| Creator provision | `provisionCreatorOrganization` with trial/safe defaults |

**Missing for tour directive:** explicit `isDemoTenant` / demo mutation namespace / demo reset / outbound block at tour layer.

---

## 7. Tests & CI (tour-relevant)

| Check | Location | In CI? |
|-------|----------|--------|
| Unit tests | `npm run test` (vitest) | No |
| Integration | `npm run test:integration` (portal phases, auth, tenants) | No |
| Firestore rules | `npm run test:firebase-rules` | No |
| Route validation | `npm run test:routes` | No |
| E2E smoke | Playwright `e2e/smoke.spec.ts` vs production URL | Yes (when build passes) |
| Full gate | `npm run production:check` | No |

**Current `main` gate status (2026-08-22):** `production:check:fast` reports **5 launch blockers** (format, mobile typecheck, portal S4 integration test, `/app/field` route tests). Tour work must not widen these failures.

---

## 8. Gaps vs directive lifecycle tour

| Directive requirement | Repo status |
|----------------------|-------------|
| Cross-route guided tour | **NOT PRESENT** |
| Demo entry `/demo` | **NOT PRESENT** |
| Demo data isolation | **NOT PRESENT** |
| Demo reset | **NOT PRESENT** |
| Progress persistence | **NOT PRESENT** |
| Role-aware tours | **NOT PRESENT** (auth model ready) |
| Mobile tour support | **NOT PRESENT** |
| Analytics for tour completion | **NOT PRESENT** |
| Canonical URL `app.yuletidelightingco.com` | **NOT IN CODEBASE** — see domain audit |

---

## 9. Recommended tour implementation anchors (for S1+)

| Concern | Suggested anchor |
|---------|------------------|
| Tour provider mount | `apps/web/src/app/app/layout.tsx` or `app-client-shell.tsx` |
| Creator tours | `apps/web/src/app/creator/layout.tsx` |
| Registry / types | `packages/types/src/tour.ts` (new) + `apps/web/src/lib/tour/` |
| Demo detection | Extend org model or env (`DEMO_ORG_SLUG`) — align with S2 |
| Lifecycle story order | Pipeline → Customer → Consultation → Proposal → Pay → Job → Schedule → Crew → Service → Storage → Rebooking |
| Stable selectors | Add `data-tour-id` attributes incrementally per checkpoint (S1+) |

---

## 10. YT-TOUR-S0 gate

| Criterion | Result |
|-----------|--------|
| Architecture mapped | **PASS** |
| Capability matrix completed | **PASS** |
| No fabricated routes | **PASS** |
| Tour infrastructure assessed | **PASS** (none present) |

**Checkpoint status:** **COMPLETE** — proceed to **YT-TOUR-S1** (tour foundation).
