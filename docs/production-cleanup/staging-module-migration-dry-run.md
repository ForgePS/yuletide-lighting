# Staging module migration dry-run

| Field               | Value                                                                          |
| ------------------- | ------------------------------------------------------------------------------ |
| **Project ID**      | `yuletide-lighting-staging`                                                    |
| **Date**            | 2026-07-31                                                                     |
| **Commit SHA**      | `cb20b419e2382bc9bb85a0f91c78fdd1658d6f1d`                                     |
| **Command**         | `npm run migrate:org-modules -- --staging --project=yuletide-lighting-staging` |
| **Mode**            | `dry-run`                                                                      |
| **Apply performed** | **NO**                                                                         |

## Results

| Metric                     | Count |
| -------------------------- | ----: |
| Organizations scanned      |     0 |
| Proposed changes           |     0 |
| Skipped                    |     0 |
| Conflicts / failures       |     0 |
| Expected writes            |     0 |
| Unknown plans              |     0 |
| Unknown keys               |     0 |
| Preserved disabled modules |   n/a |

## Rollback output

Path pattern: `docs/production-cleanup/organization-module-migration-rollback-*.json` (gitignored)

## Entitlement match

No proposed writes. Nothing to approve for apply.

## Approval recommendation

**Do not apply** on staging until test tenants exist and a non-empty audit is reviewed. Staging apply remains unauthorized in P0.2B.
