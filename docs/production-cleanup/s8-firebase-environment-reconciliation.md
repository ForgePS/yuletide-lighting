# S8 Firebase Environment Reconciliation

**PHASE:** PORTAL-P2-S8  
**DATE:** 2026-08-03  
**ENVIRONMENT:** CLI metadata only (no production Firestore/Auth data reads)  
**Production data contact:** **NOT PERFORMED**

## Firebase CLI identity

| Item                         | Value                                                               |
| ---------------------------- | ------------------------------------------------------------------- |
| Logged in as                 | `admin@forgepublicsafety.com`                                       |
| Active `firebase use`        | `yuletide-lighting` (production alias / default)                    |
| gcloud default project (CLI) | `firehouse-dashboards` (unrelated — do not use for Yuletide deploy) |

## `.firebaserc` aliases (string config — not existence proof alone)

| Alias        | Project ID string           |
| ------------ | --------------------------- |
| `default`    | `yuletide-lighting`         |
| `production` | `yuletide-lighting`         |
| `staging`    | `yuletide-lighting-staging` |

## Independently verified project existence (`firebase projects:list`)

| Display name              | Project ID                  | Classification                    |
| ------------------------- | --------------------------- | --------------------------------- |
| Yuletide Lighting         | `yuletide-lighting`         | **VERIFIED_PRODUCTION** (current) |
| Yuletide Lighting Staging | `yuletide-lighting-staging` | **VERIFIED_NONPRODUCTION**        |

Prior false assumption (“staging does not exist”) is **RESOLVED**: staging project ID is present in the authenticated account’s project list with project number `636852862858`.

## Emulator

Local gates use Firestore/Storage emulators (`firebase.json` emulator ports 8080 / 9199) → **EMULATOR_ONLY** for automated tests.

## Nonproduction deployment authorization (S8)

| Gate                              | Value                                                           |
| --------------------------------- | --------------------------------------------------------------- |
| Existing verified nonprod project | **YES** — `yuletide-lighting-staging`                           |
| Distinct from production          | **YES** (`yuletide-lighting` ≠ `yuletide-lighting-staging`)     |
| `NONPROD_DEPLOYMENT_AUTHORIZED`   | **YES** (for S8 deploy **only** to `yuletide-lighting-staging`) |
| Production deploy                 | **NOT AUTHORIZED**                                              |

## Hard pre-deploy checks (required before any deploy)

1. Authenticated identity: `admin@forgepublicsafety.com` (or user-approved identity)
2. Target project ID **must** be `yuletide-lighting-staging`
3. Target must **not** be `yuletide-lighting`
4. Release SHA recorded
5. If uncertain → **STOP**

## Services implied by repo (`firebase.json`)

- Hosting (Next.js frameworksBackend → currently references production SA email in config — **review before nonprod deploy**)
- Firestore rules + indexes
- Storage rules
- Emulators for local

**Caution:** `firebase.json` `hosting.frameworksBackend.serviceAccount` currently names `firebase-adminsdk-fbsvc@yuletide-lighting.iam.gserviceaccount.com` (production project SA). Before nonprod Hosting/Functions deploy, confirm nonprod-safe service account / backend settings so deploy cannot target production resources. Treat misconfigured SA as **LAUNCH P1** until verified.

## Staging deploy executed (rules-first, 2026-08-05)

| Service           | Staging status                                                                    |
| ----------------- | --------------------------------------------------------------------------------- |
| Firestore rules   | Deployed to `yuletide-lighting-staging`                                           |
| Firestore indexes | Deployed to `yuletide-lighting-staging`                                           |
| Storage (bucket)  | Created via console Get Started → `yuletide-lighting-staging.firebasestorage.app` |
| Storage rules     | Deployed to `yuletide-lighting-staging`                                           |
| Hosting           | **Not deployed** (S8-001)                                                         |

Evidence: `docs/production-cleanup/s8-nonprod-deploy-evidence.md`  
Production deploy URL (`…/project/yuletide-lighting/…`) is **not** the deploy target.
