# S8 Nonprod Deploy Evidence

**PHASE:** PORTAL-P2-S8  
**DATE:** 2026-08-05  
**IDENTITY:** `admin@forgepublicsafety.com`  
**TARGET:** `yuletide-lighting-staging` (VERIFIED_NONPRODUCTION)  
**RC / STATUS SHA:** `414dbf90e527ab1886a76c44b791f4f4d6569c69`  
**PRODUCTION PROJECT CONTACTED FOR DEPLOY:** **NO**

## Hard gates (all PASS)

1. Identity recorded: `admin@forgepublicsafety.com`
2. Target ID: `yuletide-lighting-staging`
3. Target ≠ `yuletide-lighting`
4. Active `firebase use` alias was production; deploy used explicit `--project yuletide-lighting-staging`

## Deploy log

| Step | Command scope | Result | Notes |
| ---- | ------------- | ------ | ----- |
| 1 | `firestore:rules,firestore:indexes,storage` | **FAIL** | Storage not set up (0 buckets) |
| 2 | `firestore:rules,firestore:indexes` | **PASS** | Rules released; indexes deployed for `(default)` |
| 3 | `storage` (retry before Get Started) | **FAIL** | API enabled, still 0 buckets |
| 4 | `storage` (after console Get Started) | **PASS** | Bucket `yuletide-lighting-staging.firebasestorage.app` (US-EAST1); storage rules released |

## Staging console (reference)

- Overview: https://console.firebase.google.com/project/yuletide-lighting-staging/overview
- Storage: https://console.firebase.google.com/project/yuletide-lighting-staging/storage

## Not deployed (intentional)

- Hosting / frameworksBackend — blocked pending **S8-001** (production SA in `firebase.json`)
- Cloud Functions beyond frameworksBackend — N/A for this pass
- Anything on `yuletide-lighting` — **NOT AUTHORIZED**

## Side effects

| Effect | Count / value |
| ------ | ------------- |
| Production Firestore reads/writes | 0 |
| Production Storage writes | 0 |
| Production Hosting deploy | NO |
| Staging Firestore rules/indexes write | YES |
| Staging Storage rules write | YES |
| Real charges / email / SMS | 0 |

## Smoke status after rules-only deploy

Full staff/portal UI smoke **not run** — Hosting not deployed to staging; no staging web surface from this pass.
Status remains **READY_PENDING_NONPROD_SMOKE** until Hosting (post S8-001) + smoke PASS.
