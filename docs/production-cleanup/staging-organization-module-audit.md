# Staging organization module audit (post P0.2C tenant)

| Field                 | Value                                                      |
| --------------------- | ---------------------------------------------------------- |
| **Project ID**        | `yuletide-lighting-staging`                                |
| **Date**              | 2026-07-31                                                 |
| **Organization**      | `8DS6mI0mfiYFIc3Ddutn` (Yuletide CRM Staging Verification) |
| **Provisioning path** | `provisionCreatorOrganization`                             |
| **Plan**              | Professional / active / monthly                            |
| **Writes in audit**   | **0**                                                      |

## Summary

| Metric                    |                                   Count |
| ------------------------- | --------------------------------------: |
| Organizations scanned     |                                       1 |
| Missing enabledModules    |                                       0 |
| Empty enabledModules      |                                       0 |
| Unknown plans             |                                       0 |
| Unknown module keys       |                                       0 |
| Missing schema versions   |                                       0 |
| Missing settings defaults | 0 (seeded via `ensureSettingsDefaults`) |
| Blocking records          |                                       0 |
| Migration required        |                                   **0** |

## Dry-run migration

```text
scanned: 1
migrationRequired: 0
applied: 0
skipped: 1 (already migrated)
```

Proposed writes for the new tenant: **0**. Migration required: **false**.
