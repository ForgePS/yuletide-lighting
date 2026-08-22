# Production deploy evidence — 2026-08-13

**AUTHORIZED BY:** User (`deploy` → `production`)  
**TARGET:** `yuletide-lighting`  
**COMMAND:** `npm run deploy:firebase`  
**RESULT:** PASS  
**HOSTING URL:** https://yuletide-lighting.web.app  
**SSR FUNCTION:** `ssryuletidelighting` (us-central1) — **Node.js 22 (2nd Gen)**  
**FUNCTION URL:** https://ssryuletidelighting-c4r24vx5hq-uc.a.run.app  

## Pre-checks

| Check | Result |
|-------|--------|
| `firebase use` | `yuletide-lighting` |
| `.env` | present |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `yuletide-lighting` |
| `PLATFORM_CREATOR_EMAILS` | SET |
| frameworksBackend SA | `firebase-adminsdk-fbsvc@yuletide-lighting.iam.gserviceaccount.com` |

## Notes

- First attempt failed: JSX syntax in `reports-widgets.tsx` (fixed, redeployed).
- Local build Node was v20.20.2 (EBADENGINE warn); **live SSR reports node v22.23.1**.
- Workspace commit at deploy time: `2114dfc` (+ uncommitted reports-widgets fix included in build).

## Post-deploy smoke (HTTP)

| Check | Result |
|-------|--------|
| `HEAD https://yuletide-lighting.web.app` | **200 OK** |
| `GET /api/health` | **ok** (`node":"v22.23.1"`, hasFirebaseProject, hasAppUrl; Stripe/Twilio unset) |

## Warnings

- Cloud Functions build image cleanup failed (possible small GCR bill) — console: `gcr.io/yuletide-lighting` / `gcf` images.
- Outdated `firebase-functions` package warning (non-blocking).
