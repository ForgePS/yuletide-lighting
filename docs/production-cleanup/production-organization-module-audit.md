# Production organization module audit (read-only)

| Field                | Value                                                               |
| -------------------- | ------------------------------------------------------------------- |
| **Project ID**       | `yuletide-lighting`                                                 |
| **Date**             | 2026-07-31                                                          |
| **Operator**         | Auto (P0.2B)                                                        |
| **Commit SHA**       | `cb20b419e2382bc9bb85a0f91c78fdd1658d6f1d`                          |
| **Command**          | `npm run audit:org-modules -- --project=yuletide-lighting --redact` |
| **Writes performed** | **0**                                                               |

## Safeguards verified

- [x] Project confirmed: `yuletide-lighting`
- [x] `FIRESTORE_EMULATOR_HOST` unset
- [x] No `--apply` / no `--allow-production-apply`
- [x] Redacted org names
- [x] Detailed JSON/CSV in gitignored `.audit-private/`

## Summary

| Metric                               | Count |
| ------------------------------------ | ----: |
| Organizations scanned                |     2 |
| Missing enabledModules               |     1 |
| Empty enabledModules                 |     0 |
| Unknown plans / tiers                |     0 |
| Unknown module keys                  |     0 |
| Missing configuration schema version |     2 |
| Migration required                   |     2 |
| Automatically safe (expected)        |   2\* |
| Manual review                        |     0 |
| Blocking records                     |     0 |

\*Both orgs appear migratable with presets/metadata stamps; **no production apply authorized in P0.2B**.

## Records (sanitized — IDs only)

| Organization ID        | Status   | Modules | Missing modules | Schema version |        Migration        |
| ---------------------- | -------- | ------: | :-------------: | :------------: | :---------------------: |
| `bdyeQorlWRWNU00fVpuN` | null     |       — |       yes       |    missing     |           yes           |
| `uxPSUKdvZyX8A5LgZo8C` | trialing |      18 |       no        |    missing     | yes (schema/tier stamp) |

## No-write confirmation

Audit exited 0 with `Writes: NONE (read-only)`. No migration apply was run against production.
