# Production deploy evidence — 2026-08-21 (YL-S26–S30 / CMS maturity)

**AUTHORIZED BY:** User (`commit deploy`)  
**TARGET:** `yuletide-lighting`  
**COMMIT:** `382f090`  
**COMMAND:** `npm run deploy:firebase`  
**RESULT:** PASS  
**HOSTING URL:** https://yuletide-lighting.web.app  
**SSR FUNCTION:** `ssryuletidelighting` (us-central1) — Node.js 22 (2nd Gen)  
**FUNCTION URL:** https://ssryuletidelighting-c4r24vx5hq-uc.a.run.app  

## Pre-checks

| Check | Result |
|-------|--------|
| Project | `yuletide-lighting` |
| `.env` | present |
| `frameworksBackend.serviceAccount` | `firebase-adminsdk-fbsvc@yuletide-lighting.iam.gserviceaccount.com` |
| Local Node | v20.20.2 (EBADENGINE warn; Cloud build uses Node 22) |

## Deployed changes (high level)

- Sneat theme restyle across staff/Creator/CMS surfaces
- YL-S26 multi-tenant production blockers (Stripe safe-mode, Twilio uniqueness, staff invite claim, crew mobile Auth, messaging honesty)
- Website CMS maturity Phases 1–4 (YL-S27–S30): schedule, TipTap, section library, new blocks, search, themes, locales, link monitor

## Warnings

- Cloud Functions build image cleanup failed (non-blocking; see GCR console)
- Outdated `firebase-functions` package warning (non-blocking)
- First deploy attempt timed out mid function update; retry completed successfully
