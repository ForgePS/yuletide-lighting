# Staging, Backup, and Rollback Runbook

## Environments

| Env | Firebase project | Hosting URL | Switch |
|-----|------------------|-------------|--------|
| Production | `yuletide-lighting` | https://yuletide-lighting.web.app | `npm run deploy:firebase` |
| Staging | `yuletide-lighting-staging` | https://yuletide-lighting-staging.web.app | `npm run deploy:staging` |

### Staging status (as of Jul 2026)

Done:
- Project created: `yuletide-lighting-staging`
- Default Hosting site exists
- Firestore `(default)` database created (`nam5`)
- Firestore rules + indexes deployed
- Deploy script uses `--staging` and `.env.staging` when present (never targets production)

Blocked on your console (billing required):
1. Link a billing account to `yuletide-lighting-staging`  
   https://console.cloud.google.com/billing/linkedaccount?project=yuletide-lighting-staging
2. Storage → Get Started  
   https://console.firebase.google.com/project/yuletide-lighting-staging/storage
3. Authentication → Get Started (Email/Password)
4. Project settings → Add web app → copy config into `.env.staging` (see `.env.staging.example`)
5. `npm run deploy:staging`

Keep separate `.env.staging` / `.env`. Never point staging Admin SDK at production Firestore.

## Deploy

```bash
# Production
npm run deploy:firebase

# Staging (requires billing + Storage + web app config)
npm run deploy:staging
```

Record the Hosting release ID from the Firebase console before each production deploy.

## Backup

Bucket: `gs://yuletide-lighting-firestore-backups` (production)

Manual export:

```bash
gcloud firestore export gs://yuletide-lighting-firestore-backups/manual-$(date +%Y%m%d) --project=yuletide-lighting
```

Scheduled exports (recommended):
1. Firebase Console → Firestore → Backups → create daily schedule to that bucket, 30-day retention  
   or Cloud Scheduler calling `gcloud firestore export`
2. Quarterly restore drill: restore an export into staging, verify customer/proposal/invoice counts and one public proposal token

## Rollback

1. Firebase Console → Hosting → Releases → Rollback prior version  
   or `firebase hosting:rollback --project yuletide-lighting`
2. If Firestore rules caused the incident, redeploy the previous `firestore.rules` from git.
3. Document the incident in `deploy-log.txt`.

## Smoke checklist after deploy

See `docs/production-launch-checklist.md`.
