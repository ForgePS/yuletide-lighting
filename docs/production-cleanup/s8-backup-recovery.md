# S8 Backup / Recovery Minimum

**PHASE:** PORTAL-P2-S8  
**DATE:** 2026-08-03

## Firestore

- Prefer Google Cloud Firestore managed backups / PITR if enabled on `yuletide-lighting`
- **S8 did not read production** to confirm backup enablement → mark **VERIFY BEFORE GO-LIVE** (ops checkbox; may return `PRODUCTION_READ_ONLY_AUTHORIZATION_REQUIRED` for console confirmation only)

## Storage

- Rely on GCS versioning / backup policy for Firebase Storage bucket
- Verify in console before go-live (no S8 production API reads performed)

## Configuration backup

- Git is source of truth for rules, indexes, app code
- Tag RC SHA at go-live

## Release rollback

- Hosting previous version (`s8-production-rollback.md`)

## Limitations

- S8 does not build a custom backup subsystem
- Confirm managed backup/PITR as a pre-deploy checkbox, not a code feature
