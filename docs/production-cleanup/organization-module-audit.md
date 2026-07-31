# Organization module audit

Generated via emulator fixtures (redacted).  
Command: `npm run migrate:org-modules:dry-run:emulator`

## Summary (emulator fixtures)

| Metric                             | Count |
| ---------------------------------- | ----: |
| Organizations scanned              |     5 |
| Missing enabledModules             |     1 |
| Empty enabledModules               |    2+ |
| Unknown module key occurrences     |     0 |
| Migration required                 |     4 |
| Unsafe unknown tier (not migrated) |     1 |

## Emulator fixture outcomes

| Fixture ID               | Outcome                                                 |
| ------------------------ | ------------------------------------------------------- |
| `org_missing_modules`    | Migrates to **trial** (8 modules)                       |
| `org_empty_modules`      | Migrates to **standard** (18 modules) for active legacy |
| `org_disabled_preserved` | Standard preset minus `sign_tracker` (17 modules)       |
| `org_with_modules`       | Skipped (already configured)                            |
| `org_unknown_plan`       | **Failed safely** (`subscriptionTier=gold`) — no write  |

## Production / staging

Re-run against a real project (read-only):

```bash
npm run audit:org-modules -- --staging --redact
# or
npm run audit:org-modules -- --project=yuletide-lighting --redact
```

Do **not** commit unredacted JSON/CSV (gitignored).  
Do **not** run `--apply` against production without explicit authorization.
