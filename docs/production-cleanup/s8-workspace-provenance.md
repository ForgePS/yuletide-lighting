# S8 Workspace Provenance

**PHASE:** PORTAL-P2-S8  
**ENVIRONMENT:** EMULATOR / release worktree  
**DATE:** 2026-08-03  
**RELEASE WORKTREE:** `C:\Users\jerem\Projects\christmas-light-crm-s8-go-live`  
**RELEASE SHA:** `899b715d8c5067fce9fd345395c05025366a0a16`

## Verdict

**PASS** — all inspected workspace packages resolve inside the release worktree. Sibling dirty worktrees are **not** consumed.

## Resolution evidence

| Package              | Resolved physical path                                   |
| -------------------- | -------------------------------------------------------- |
| `@clcrm/types`       | `...\christmas-light-crm-s8-go-live\packages\types`      |
| `@yuletide/firebase` | `...\christmas-light-crm-s8-go-live\packages\firebase`   |
| `@clcrm/api`         | `...\christmas-light-crm-s8-go-live\packages\api`        |
| `@clcrm/web`         | `...\christmas-light-crm-s8-go-live\apps\web`            |
| `@clcrm/ui`          | `...\christmas-light-crm-s8-go-live\packages\ui`         |
| `@clcrm/validators`  | `...\christmas-light-crm-s8-go-live\packages\validators` |
| `@clcrm/mobile`      | `...\christmas-light-crm-s8-go-live\apps\mobile`         |

| Check                                                | Result                                      |
| ---------------------------------------------------- | ------------------------------------------- |
| `node_modules/@clcrm/types`                          | SYMLINK → this worktree `packages/types`    |
| `node_modules/@yuletide/firebase`                    | SYMLINK → this worktree `packages/firebase` |
| Resolves to `christmas-light-crm` (main dirty)       | **NO**                                      |
| Resolves to `christmas-light-crm-s7-token-hardening` | **NO**                                      |
| Resolves to `christmas-light-crm-s8-go-live`         | **YES**                                     |

## Launch rule

S8 gates must run only from:

`C:\Users\jerem\Projects\christmas-light-crm-s8-go-live`

If package resolution points at another worktree → **BLOCKED**.
