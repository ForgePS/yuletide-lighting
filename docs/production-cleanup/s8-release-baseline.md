# S8 Release Baseline

**PHASE:** PORTAL-P2-S8  
**ENVIRONMENT:** EMULATOR (baseline local gates) / release prep  
**DATE:** 2026-08-03  
**Production deployment:** NOT AUTHORIZED  
**Production writes:** NOT AUTHORIZED  
**Production read-only:** NOT AUTHORIZED

## Release source

| Item                                     | Value                                                             |
| ---------------------------------------- | ----------------------------------------------------------------- |
| Release branch                           | `release/yuletide-go-live-readiness`                              |
| Base / HEAD SHA                          | `899b715d8c5067fce9fd345395c05025366a0a16`                        |
| Worktree path                            | `C:\Users\jerem\Projects\christmas-light-crm-s8-go-live`          |
| Source S7 closeout SHA                   | `899b715d8c5067fce9fd345395c05025366a0a16`                        |
| Accepted S7A                             | `472c2479066a9591974588297059e7aec59f1b2e`                        |
| Accepted S7B functional                  | `2661de3ab25f4d4b4db7bfcc79721bfa3374dc75`                        |
| S7 SHA-stamp                             | `11365f8ebfd710324cb762f9343480c7a939388d`                        |
| Dirty S7 worktree (do not use for gates) | `christmas-light-crm-s7-token-hardening` (CRLF / unrelated churn) |

## Git status (release worktree at creation)

```text
clean — no modified/untracked files at worktree add
HEAD=899b715 (exact S7 closeout)
```

## Toolchain (recorded at baseline)

| Tool               | Version                                                         |
| ------------------ | --------------------------------------------------------------- |
| Node               | v24.15.0 (package engines recommend Node 20 — note for RC / CI) |
| npm                | 11.12.1                                                         |
| Firebase CLI       | 15.22.4                                                         |
| Next.js (apps/web) | ^15.1.3                                                         |

## Intent

- Clean release candidate source for launch readiness only
- No product features
- Fix P0 / launch-critical P1 only
- Real nonprod deploy only if independently verified existing project
- No production contact without separate authorization

## Next

1. `s8-workspace-provenance.md`
2. Full local baseline gate
3. Firebase environment reconciliation
