# Portal Phase 2 S7B — Baseline

**ENVIRONMENT:** EMULATOR  
**CHECKPOINT:** PORTAL-P2-S7B  
**DATE:** 2026-08-03  
**BRANCH:** `work/portal-p2-s7-token-hardening`  
**WORKTREE:** `christmas-light-crm-s7-token-hardening`  
**S7A CHECKPOINT SHA:** `472c2479066a9591974588297059e7aec59f1b2e`

## Purpose

Record the committed S7A starting point for S7B session-first URL cutover, URL/browser secret hardening, and emulator hash-migration stages D–F. S7B does **not** authorize production Firebase contact, production token migration, deploy, or P2-S8.

## Repository isolation

| Item               | Value                                                                                              |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| Worktree           | `C:\Users\jerem\Projects\christmas-light-crm-s7-token-hardening`                                   |
| Branch             | `work/portal-p2-s7-token-hardening`                                                                |
| S7A checkpoint     | `472c2479066a9591974588297059e7aec59f1b2e`                                                         |
| Package resolution | `@clcrm/types` → this worktree `packages/types` (see `portal-phase-2-s7b-workspace-resolution.md`) |
| Environment        | FIREBASE EMULATOR ONLY                                                                             |

## Constraints

- Production Firebase reads/writes: **PROHIBITED**
- Production token inventory / backfill / plaintext removal: **PROHIBITED**
- Deployment: **PROHIBITED**
- Do not start P2-S8

## S7A carry-forward (committed)

- Hash-only new magic credentials (`accessTokenHash`)
- Hash-first resolver + COMPATIBILITY plaintext fallback
- Session decoupling from magic credential storage
- DTO leak removal; one-time enable/rotate delivery
- Emulator migration tool + `audit:portal-token-security`
- Evidence: `portal-phase-2-s7a-completion.md`

## S7B preflight gates

Preflight format / lint / typecheck / unit / integration / rules / 10 portal audits / build / `production:check` results: **PENDING** (record when run from S7A checkpoint).

Do not invent PASS results. Correct a red committed S7A baseline before S7B implementation gates.
