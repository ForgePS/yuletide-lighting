# Staging organization module audit (read-only)

| Field                | Value                                                                        |
| -------------------- | ---------------------------------------------------------------------------- |
| **Project ID**       | `yuletide-lighting-staging`                                                  |
| **Date**             | 2026-07-31                                                                   |
| **Operator**         | Auto (P0.2B)                                                                 |
| **Commit SHA**       | `cb20b419e2382bc9bb85a0f91c78fdd1658d6f1d`                                   |
| **Command**          | `npm run audit:org-modules -- --staging --project=yuletide-lighting-staging` |
| **Writes performed** | **0**                                                                        |

## Safeguards verified

- [x] Project ID confirmed: `yuletide-lighting-staging`
- [x] `FIRESTORE_EMULATOR_HOST` unset
- [x] No `--apply` flag
- [x] Script is read-only
- [x] Output redacted; detailed JSON/CSV in gitignored `.audit-private/`

## Summary

| Metric                               | Count |
| ------------------------------------ | ----: |
| Organizations scanned                |     0 |
| Missing enabledModules               |     0 |
| Empty enabledModules                 |     0 |
| Unknown plans / tiers                |     0 |
| Unknown module keys                  |     0 |
| Invalid plan/module combinations     |     0 |
| Missing configuration schema version |     0 |
| Missing settings defaults            |     0 |
| Creator-only module findings         |     0 |
| Automatically safe migrations        |     0 |
| Manual-review records                |     0 |
| Blocking records                     |     0 |
| Migration required                   |     0 |

## Interpretation

Staging currently contains **no organization documents**. There is nothing to migrate on staging until test tenants are provisioned.

## No-write verification

Audit completed with `Writes: NONE (read-only)` and exit code 0. No organization documents were created, updated, or deleted.
