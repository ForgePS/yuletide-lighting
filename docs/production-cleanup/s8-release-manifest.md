# S8 Release Manifest

**PHASE:** PORTAL-P2-S8  
**DATE:** 2026-08-03

| Field                            | Value                                                      |
| -------------------------------- | ---------------------------------------------------------- |
| Release branch                   | `release/yuletide-go-live-readiness`                       |
| Base SHA (S7 closeout)           | `899b715d8c5067fce9fd345395c05025366a0a16`                 |
| Worktree                         | `C:\Users\jerem\Projects\christmas-light-crm-s8-go-live`   |
| RC SHA                           | _pending — commit S8 docs + format fixes_                  |
| Lockfile                         | `package-lock.json` (from base; no intentional dep change) |
| Node observed                    | v24.15.0 (engines: 20 — prefer 20 for Hosting)             |
| Firebase CLI                     | 15.22.4                                                    |
| Nonprod target (if deploy later) | `yuletide-lighting-staging`                                |
| Production target                | `yuletide-lighting` (**not** deployed in S8)               |

## Freeze rule

After RC commit passes post-commit gates: no P2/P3 / feature / cleanup commits without invalidating RC.
