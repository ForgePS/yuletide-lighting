# Staging, Backup, and Rollback Runbook

## Environments

| Env | Firebase project | Hosting URL |
|-----|------------------|-------------|
| Production | `yuletide-lighting` | https://yuletide-lighting.web.app |
| Staging | create `yuletide-lighting-staging` (recommended) | TBD |

Keep separate `.env.staging` / `.env.production`. Never point staging Admin SDK at production Firestore.

## Deploy

```bash
node scripts/deploy-firebase.mjs
```

Record the Hosting release ID from the Firebase console before each production deploy.

## Backup

1. Enable Firestore scheduled exports to a GCS bucket (daily).
2. Retain at least 30 days of exports.
3. Quarterly restore drill:
   - Export a staging copy from production backup
   - Restore into staging project
   - Verify customer/proposal/invoice counts and one public proposal token

## Rollback

1. Firebase Console → Hosting → Releases → Rollback prior version  
   or `firebase hosting:rollback --project yuletide-lighting`
2. If Firestore rules caused the incident, redeploy the previous `firestore.rules` from git.
3. Document the incident in `deploy-log.txt`.

## Smoke checklist after deploy

See `docs/production-launch-checklist.md`.
