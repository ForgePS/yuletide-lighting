# S8-001 Hosting Service Account Resolution

**PHASE:** PORTAL-P2-S8  
**DATE:** 2026-08-05  
**STATUS:** RESOLVED (deploy-time SA selection)  
**DEFECT:** `firebase.json` `hosting.frameworksBackend.serviceAccount` names production SA

## Verified accounts (CLI list, no keys)

| Project                     | Hosting frameworksBackend SA                                                |
| --------------------------- | --------------------------------------------------------------------------- |
| `yuletide-lighting`         | `firebase-adminsdk-fbsvc@yuletide-lighting.iam.gserviceaccount.com`         |
| `yuletide-lighting-staging` | `firebase-adminsdk-fbsvc@yuletide-lighting-staging.iam.gserviceaccount.com` |

## Fix

`scripts/deploy-firebase.mjs` now:

1. Maps target project → matching `firebase-adminsdk-fbsvc@<project>.iam…` SA
2. Rewrites `firebase.json` for the duration of deploy
3. Restores checked-in `firebase.json` in `finally` (backup: `firebase.json.deploy-backup`, gitignored)
4. **HARD FAIL** if staging would bind `@yuletide-lighting.iam…`
5. **HARD FAIL** if staging deploy runs without `.env.staging`

Checked-in `firebase.json` retains the production SA as the production default.

## Remaining before staging Hosting smoke

- [x] Create Firebase Web app on staging — `1:636852862858:web:004bc578eb8aa7a2ecd273`
- [x] Populate local `.env.staging` from staging SDK config (gitignored)
- [x] Run Hosting-only deploy to `yuletide-lighting-staging` (`d98669b`, `--force` PASS)
- [x] Anonymous smoke (`/api/health`, `/`, `/sign-in`) PASS; REAL charges/email/SMS = 0
- [ ] Authenticated staff + portal session smoke (Auth/tenant provision)
