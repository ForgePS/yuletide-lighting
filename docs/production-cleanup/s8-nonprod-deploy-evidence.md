# S8 Nonprod Deploy Evidence

**PHASE:** PORTAL-P2-S8  
**DATE:** 2026-08-05  
**IDENTITY:** `admin@forgepublicsafety.com`  
**TARGET:** `yuletide-lighting-staging` (VERIFIED_NONPRODUCTION)  
**HOSTING DEPLOY SHA:** `d98669ba51de200ccceb826357f4631773047129`  
**PRODUCTION PROJECT CONTACTED FOR DEPLOY:** **NO**

## Deploy summary

| Service | Result |
| ------- | ------ |
| Firestore rules + indexes | PASS |
| Storage rules | PASS (`yuletide-lighting-staging.firebasestorage.app`) |
| Hosting + SSR frameworksBackend | PASS (`https://yuletide-lighting-staging.web.app`) |
| Hosting SA at deploy | staging adminsdk (S8-001 rewrite); checked-in `firebase.json` restored to production SA |

## Auth + tenant

- Identity Platform initialized; Email/Password enabled
- Org `8DS6mI0mfiYFIc3Ddutn` / slug `yuletide-staging-verification`
- 11 roles `authProvisioned=yes`
- Seed fixtures applied; outbound delivery disabled in org settings

## Smoke

```text
SMOKE_ENV=yuletide-lighting-staging
SMOKE_SHA=d98669ba51de200ccceb826357f4631773047129
SMOKE_RESULT=PASS
AUTH_RESULT=AUTH_PASS
PORTAL_RESULT=PORTAL_PASS
REAL_CHARGES=0
REAL_EMAIL=0
REAL_SMS=0
```

| Check | Result |
| ----- | ------ |
| `/api/health`, `/`, `/sign-in` | 200 |
| Staff `signInWithPassword` (owner) | AUTH_PASS |
| Portal `POST /api/portal/session` → cookie → `/portal/app` | PORTAL_PASS (sessionStatus 200, hasSessionCookie true, portalAppPath `/portal/app`) |

Scripts: `scripts/s8-staging-auth-smoke.mjs`, `scripts/s8-staging-portal-smoke.ts`
