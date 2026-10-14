# Yuletide Domain Audit (YT-TOUR-S0)

**Date:** 2026-08-22  
**Branch:** `main` @ `fcc4a29`  
**Directive canonical app URL:** `https://app.yuletidelightingco.com`  
**Directive canonical marketing URL:** `https://www.yuletidelightingco.com`  
**Directive legacy URL (do not use for new features):** `https://cms.yuletidelightingco.com`

---

## 1. Executive summary

| Domain / pattern | Occurrences in repo | Classification |
|------------------|---------------------|----------------|
| `cms.yuletidelightingco.com` | **0** | **NOT IN REPO** — no action |
| `app.yuletidelightingco.com` | **0** | **REPLACE** — adopt for all new tour/demo URLs when implemented |
| `www.yuletidelightingco.com` | **0** (bare `www` host) | **REPLACE** for generated marketing links in new code |
| `yuletidelightingco.com` (email / brand) | **4 code + docs** | **KEEP** — business contact addresses, not app host |
| `yuletide-lighting.web.app` | **40+** | **UNKNOWN — REQUIRES REVIEW** — current Firebase Hosting default; may redirect to custom domain in DNS |
| `yuletide-lighting.firebaseapp.com` | Auth domain default in `next.config.js` | **KEEP** — Firebase Auth authorized domain |
| `localhost:3000` | `.env.example` dev default | **KEEP** — local development |

**Critical finding:** The codebase has **never been updated** to the directive's canonical `app.yuletidelightingco.com`. All application URL fallbacks point to **`https://yuletide-lighting.web.app`**. New tour/demo/onboarding code must use `https://app.yuletidelightingco.com` per directive §0 — and a follow-on infra task should align `NEXT_PUBLIC_APP_URL` in production Hosting with the custom domain.

---

## 2. Search: `cms.yuletidelightingco.com`

```
rg "cms\.yuletidelightingco\.com" → 0 matches
```

**Classification:** **NOT IN REPO**

No legacy CMS subdomain references to remove or redirect in application code. If DNS still serves this host, handle at Firebase Hosting / DNS layer outside this repository.

---

## 3. Search: `yuletidelightingco.com`

### 3.1 Application / marketing code

| File | Usage | Classification |
|------|-------|----------------|
| `apps/web/src/lib/company.ts` | `info@yuletidelightingco.com` — public company contact | **KEEP** — email identity, not app URL |
| `apps/web/src/lib/crm-marketing.ts` | `hello@yuletidelightingco.com` — CRM product support email | **KEEP** — email identity |
| `scripts/s8-production-auth-smoke.mjs` | Example `SMOKE_EMAIL=info@yuletidelightingco.com` | **KEEP** — smoke test account email |

### 3.2 Documentation

| File | Usage | Classification |
|------|-------|----------------|
| `docs/production-launch-checklist.md` | Creator allowlist email `info@yuletidelightingco.com` | **KEEP** — operational record |

**Note:** These are **mailbox addresses** on the business domain, not navigation hosts. They do not violate the directive's app-URL rule.

---

## 4. Application URL fallbacks (`yuletide-lighting.web.app`)

All entries default to Firebase Hosting when `NEXT_PUBLIC_APP_URL` is unset:

| File | Context | Classification |
|------|---------|----------------|
| `apps/web/next.config.js` | `NEXT_PUBLIC_APP_URL` default | **UNKNOWN — REQUIRES REVIEW** — should become `https://app.yuletidelightingco.com` when custom domain is confirmed live |
| `.env.example` | Comment example only | **KEEP** (comment) |
| `.github/workflows/deploy.yml` | CI deploy sets `NEXT_PUBLIC_APP_URL=https://yuletide-lighting.web.app` | **REPLACE** when custom domain is production-canonical |
| `.github/workflows/ci.yml` | E2E `E2E_BASE_URL` | **UNKNOWN — REQUIRES REVIEW** |
| `playwright.config.ts` | Default E2E base | **UNKNOWN — REQUIRES REVIEW** |
| `scripts/deploy-firebase.mjs` | Production URL fallback | **REPLACE** (with env override path kept) |
| `scripts/s8-production-auth-smoke.mjs` | `PRODUCTION_BASE_URL` default | **UNKNOWN — REQUIRES REVIEW** |
| `scripts/s8-production-portal-smoke.ts` | Same | **UNKNOWN — REQUIRES REVIEW** |
| `packages/firebase/src/portal360.ts` | Link generation fallback | **REPLACE** in new tour-related link builders; existing fallback OK until env aligned |
| `packages/firebase/src/customer360.ts` | Portal/QR link base | **REPLACE** (env-first pattern already exists) |
| `packages/firebase/src/portal-qr360.ts` | QR access URLs | **REPLACE** (env-first) |
| `packages/firebase/src/mockups360.ts` | Public mockup links | **REPLACE** (env-first) |
| `packages/firebase/src/reviews360.ts` | Review request links | **REPLACE** (env-first) |
| `packages/types/src/creator.ts` | `marketingUrl`, `hostingUrl` defaults | **REPLACE** |
| `apps/mobile/lib/api.ts` | `EXPO_PUBLIC_API_URL` fallback | **REPLACE** when app domain canonical |
| `apps/mobile/app.json` | `apiUrl` | **REPLACE** |
| `apps/web/src/app/sitemap.ts` | Sitemap base | **REPLACE** |
| `apps/web/src/components/customers/portal-qr-generator-modal.tsx` | Preview sample URL | **REPLACE** — hardcoded preview should use env or canonical constant |
| `docs/*` (multiple) | Deploy evidence, staging docs | **KEEP** — historical deploy records |

**Recommendation:** Introduce a single `CANONICAL_APP_URL` constant (e.g. `apps/web/src/lib/canonical-url.ts`) set to `https://app.yuletidelightingco.com` for **all new tour/demo/onboarding links**. Migrate existing fallbacks in a dedicated domain-alignment sprint (not YT-TOUR-S0).

---

## 5. Auth callbacks & redirects

| Mechanism | Configuration | Finding |
|-----------|---------------|---------|
| Firebase Auth domain | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` → `yuletide-lighting.firebaseapp.com` | **KEEP** — must remain in Firebase authorized domains |
| Staff sign-in redirect | Client-side → `/app` after `establishServerSession` | No hardcoded external URL |
| Sign-up flow | → `/onboarding` | Internal route only |
| Portal session | `/api/portal/session`, cookie `__portal_session` | Relative paths |
| Stripe Connect onboarding | `apps/web/src/app/api/stripe/billing/route.ts` — return URLs use request origin | **OK** — inherits deployed host |
| Password reset | Firebase `sendPasswordResetEmail` | Uses Firebase action URL config (Firebase console — **VERIFY** authorized domain includes `app.yuletidelightingco.com`) |
| Invitation links | `inviteOrgUser` / staff invite pages `/invite/[token]` | Relative; base from `NEXT_PUBLIC_APP_URL` when absolute links generated |

**Action for tour sprint:** When adding demo invite emails, use `https://app.yuletidelightingco.com` explicitly.

---

## 6. Firebase configuration

| Setting | Value | Notes |
|---------|-------|-------|
| Production project | `yuletide-lighting` | `.firebaserc` |
| Staging project | `yuletide-lighting-staging` | |
| Auth domain (default) | `yuletide-lighting.firebaseapp.com` | Not `yuletidelightingco.com` |
| Hosting | Next.js SSR `ssryuletidelighting` | Evidence: `docs/production-cleanup/s8-production-deploy-2026-08-21-cms.md` |

**VERIFY in Firebase Console (outside repo):**
- Custom domain `app.yuletidelightingco.com` attached to Hosting
- `app.yuletidelightingco.com` in Auth authorized domains
- OAuth redirect URIs if Google/social sign-in added later

---

## 7. CORS / CSP / security headers

| Source | Finding |
|--------|---------|
| `apps/web/next.config.js` | Portal legacy token cache headers only; **no CSP** defining allowed origins |
| Middleware | Cookie/session gate; no domain allow-list |

No CORS allow-list references to legacy CMS domain found.

---

## 8. Environment files

| File | App URL | Classification |
|------|---------|----------------|
| `.env.example` | `NEXT_PUBLIC_APP_URL=http://localhost:3000` | **KEEP** — local dev |
| `.env.staging.example` | Staging URLs (if present) | **KEEP** — staging isolation |

Production values not committed (correct). Deploy workflow injects `yuletide-lighting.web.app` today.

---

## 9. Tests referencing domains

| Test | URL used | Classification |
|------|----------|----------------|
| `e2e/smoke.spec.ts` | `E2E_BASE_URL` env | **UNKNOWN — REQUIRES REVIEW** |
| `e2e/portal-phase2-security.spec.ts` | `yuletide-lighting.web.app` fallback | **UNKNOWN — REQUIRES REVIEW** |
| Playwright CI | Production hosting URL | **KEEP** until custom domain E2E added |

Tour E2E (future YT-TOUR-S14+) should target `https://app.yuletidelightingco.com/demo` per directive.

---

## 10. Rules for new tour / demo code (YT-TOUR-S1+)

1. **Always** generate user-facing links with `https://app.yuletidelightingco.com` (or `process.env.NEXT_PUBLIC_APP_URL` once production env is updated to match).
2. **Never** introduce `cms.yuletidelightingco.com`.
3. **Do not** remove `yuletidelightingco.com` email constants — they are business contact, not app hosts.
4. **Do not** blindly replace `yuletide-lighting.web.app` in historical docs or deploy evidence.
5. Document any remaining `web.app` fallbacks in tour PR descriptions until domain migration completes.

---

## 11. YT-TOUR-S0 domain gate

| Criterion | Result |
|-----------|--------|
| Legacy CMS domain searched | **PASS** (zero hits) |
| Business domain classified | **PASS** |
| App URL gap documented | **PASS** |
| Replace vs keep guidance for new code | **PASS** |

**Checkpoint status:** **COMPLETE**
