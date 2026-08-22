# S8 Migration Inventory (Offline)

**PHASE:** PORTAL-P2-S8  
**DATE:** 2026-08-03  
**RULE:** Do not run against production

| Script / mechanism                        | Classification                         | Notes                                                    |
| ----------------------------------------- | -------------------------------------- | -------------------------------------------------------- |
| `scripts/portal-token-migration.mjs`      | POST_LAUNCH / DANGEROUS MANUAL         | Emulator-guarded; production hard-blocked; not day-1     |
| `scripts/migrate-organization-modules.ts` | POST_LAUNCH / MANUAL                   | Needs separate auth + possibly read-only inventory first |
| `scripts/seed-staging-verification.ts`    | NOT_REQUIRED for prod go-live          | Staging only                                             |
| `scripts/cleanup-staging-verification.ts` | NOT_REQUIRED                           | Staging only                                             |
| `scripts/seed-website-cms.ts`             | NOT_REQUIRED                           | Manual content                                           |
| Hosting deploy itself                     | REQUIRED_FOR_GO_LIVE (when authorized) | App code only; must not auto-run migrations              |
| Rules/indexes deploy                      | REQUIRED_FOR_GO_LIVE (when authorized) | Separate from data migrations                            |

## Portal token policy for day-1

COMPATIBILITY mode + hash-capable code is **acceptable**. Plaintext field removal is **not** required for go-live.
