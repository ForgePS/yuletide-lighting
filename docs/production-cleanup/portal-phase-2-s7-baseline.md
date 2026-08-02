# Portal Phase 2 S7 — Baseline

**ENVIRONMENT:** EMULATOR
**PHASE:** PORTAL-P2-S7 Legacy Magic-Token Hardening, Hash-Only Storage, and Session-First URL Cutover
**DATE:** 2026-08-02

## Repository isolation

| Item                    | Value                                                                                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Original branch         | `production/yuletide-cleanup-launch-readiness`                                                                                            |
| Original dirty worktree | `C:\Users\jerem\Projects\christmas-light-crm` (preserved; not modified by S7)                                                             |
| Original dirty contents | Gate `.txt` logs, staging reconciliation scripts/docs, `tsbuildinfo`, `format-changed.mjs` / provision-staging churn — **not** part of S7 |
| S7 worktree             | `C:\Users\jerem\Projects\christmas-light-crm-s7-token-hardening`                                                                          |
| S7 branch               | `work/portal-p2-s7-token-hardening`                                                                                                       |
| S7 base SHA             | `d98c3e90715e4a7e104285a68ea16cc56811c30b`                                                                                                |
| S5 SHA                  | `d9d8242ad6df0f9e6f58af27baa96bcf16135a3d`                                                                                                |
| S6 functional SHA       | `b7f2cc1edadfd4351f70e5b3682ac561751369eb`                                                                                                |
| S6 docs SHA             | `d98c3e90715e4a7e104285a68ea16cc56811c30b`                                                                                                |
| S7 functional SHA       | `630aa7f50a8fa3c8bc868505e6288ede9c6965b4`                                                                                                |
| S7 docs SHA             | `3744d2a96fe50274e0418f6ecb7c44ca228982c6`                                                                                                |
| Environment             | FIREBASE EMULATOR ONLY                                                                                                                    |

## Constraints

- Production Firebase reads/writes: **PROHIBITED**
- Production token migration: **PROHIBITED**
- Deployment: **PROHIBITED**
- Do not merge into original dirty worktree automatically
- Do not start P2-S8 until S7 complete

## Preflight

Clean worktree gates completed on 2026-08-02 (see `portal-phase-2-s7-completion.md`):
format / lint / typecheck / unit(213) / integration / rules 18/18 / 10 portal audits / E2E / build / `production:check` ×3 — PASS.
