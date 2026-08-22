# S8 Production Deployment Diff (PREPARE ONLY)

**PHASE:** PORTAL-P2-S8  
**DATE:** 2026-08-03  
**RELEASE SHA (base):** `899b715d8c5067fce9fd345395c05025366a0a16`  
**APPLY TO PRODUCTION:** **NO — NOT AUTHORIZED**

## Would change if production deploy were later authorized

| Component              | Source in repo                         | Action if authorized                       | Notes                                                      |
| ---------------------- | -------------------------------------- | ------------------------------------------ | ---------------------------------------------------------- |
| Hosting                | `apps/web` via `firebase.json` hosting | Deploy Next/frameworksBackend              | Confirm SA & env on **production** only with separate auth |
| Firestore rules        | `firestore.rules`                      | `firebase deploy --only firestore:rules`   | Diff vs live unknown without prod read                     |
| Storage rules          | `storage.rules`                        | `firebase deploy --only storage`           | Same                                                       |
| Firestore indexes      | `firestore.indexes.json`               | `firebase deploy --only firestore:indexes` | May be long-running                                        |
| Functions / API        | Hosting frameworksBackend / Cloud Run  | Tied to Hosting deploy                     | Production SA currently named in firebase.json             |
| Env / secrets          | Hosting config / Secret Manager        | Manual                                     | See `s8-environment-manifest.md`                           |
| Migrations             | `scripts/*migration*`                  | **Manual only**                            | Must not auto-run on deploy                                |
| Portal token migration | `scripts/portal-token-migration.mjs`   | **NOT for go-live day**                    | COMPATIBILITY mode OK; separate auth later                 |

## Explicitly excluded from automatic go-live

- Production portal plaintext removal
- Production HASH_ONLY flip
- Production Auth user inventory
- Blind `firebase deploy` without checklist

## Recommended authorized production sequence (future)

1. Freeze RC SHA
2. Deploy rules/indexes (optional canary order)
3. Deploy Hosting with production env
4. Post-deploy smoke (`s8-post-deploy-smoke-plan.md`)
5. Separate auth for migrations / portal token backfill

**This document does not apply any change.**
