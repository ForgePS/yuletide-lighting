# Portal Phase 2 S7B — Workspace Resolution

**ENVIRONMENT:** EMULATOR  
**DATE:** 2026-08-03  
**CHECKPOINT:** PORTAL-P2-S7B  
**S7A CHECKPOINT SHA:** `472c2479066a9591974588297059e7aec59f1b2e`

## Purpose

Verify that S7B gates execute against committed S7 worktree source, not a sibling dirty worktree.

## Resolution evidence

| Consumer            | `require.resolve('@clcrm/types')`                                                            |
| ------------------- | -------------------------------------------------------------------------------------------- |
| Repo root           | `C:\Users\jerem\Projects\christmas-light-crm-s7-token-hardening\packages\types\src\index.ts` |
| `packages/firebase` | Same path (worktree-local)                                                                   |

| Item                                    | Value                                                       |
| --------------------------------------- | ----------------------------------------------------------- |
| `node_modules/@clcrm/types`             | Symlink → this worktree `packages/types`                    |
| Sibling `christmas-light-crm` consumed? | **NO**                                                      |
| Workspaces                              | Root `package.json` `"workspaces": ["apps/*","packages/*"]` |
| Types package entry                     | `"main": "./src/index.ts"`, `"types": "./src/index.ts"`     |

## Correction

None required for current S7 worktree. Earlier S7A P2 note about possible sibling resolution does not reproduce after local workspace linking.

## Final verification

S7B typecheck / test / build / production:check must be run from:

`C:\Users\jerem\Projects\christmas-light-crm-s7-token-hardening`

with HEAD at or after S7A checkpoint `472c2479066a9591974588297059e7aec59f1b2e`.
