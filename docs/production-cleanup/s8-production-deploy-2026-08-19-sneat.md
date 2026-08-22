# Production deploy evidence — 2026-08-19 (Sneat theme)

**AUTHORIZED BY:** User (`deploy`)  
**TARGET:** `yuletide-lighting`  
**COMMAND:** `npm run deploy:firebase`  
**RESULT:** PASS  
**HOSTING URL:** https://yuletide-lighting.web.app  
**SSR FUNCTION:** `ssryuletidelighting` (us-central1) — **Node.js 22 (2nd Gen)**  
**FUNCTION URL:** https://ssryuletidelighting-c4r24vx5hq-uc.a.run.app  

## Pre-checks

| Check | Result |
|-------|--------|
| Project | `yuletide-lighting` |
| `.env` | present |
| `frameworksBackend.serviceAccount` | `firebase-adminsdk-fbsvc@yuletide-lighting.iam.gserviceaccount.com` |
| Local Node | v20.20.2 (EBADENGINE warn; Cloud build uses Node 22) |

## Deployed changes (high level)

- Sneat v3 theme tokens applied to staff shell, Creator Console, and CMS panels
- CMS cache invalidation + revalidate on save (prior sprint)
- Transparent Yuletide logo assets

## Warnings

- Cloud Functions build image cleanup failed (non-blocking; see GCR console)
- Outdated `firebase-functions` package warning (non-blocking)
