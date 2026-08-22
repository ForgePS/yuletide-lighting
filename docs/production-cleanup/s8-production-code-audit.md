# S8 Production Code Audit (launch-critical scan)

**PHASE:** PORTAL-P2-S8  
**DATE:** 2026-08-03  
**METHOD:** Targeted search + classification (not every hit is a defect)  
**ENVIRONMENT:** Release worktree review

## Search themes

`localStorage` / `sessionStorage` / `mock` / `stub` / `TODO` / `FIXME` / `placeholder` / `fake` / `demo` / `in-memory` in portal + CRM launch paths.

## Classification rules

| Severity | When                                                                                                             |
| -------- | ---------------------------------------------------------------------------------------------------------------- |
| P0/P1    | Launch workflow pretends to save, persists only in browser, or treats mock/provider fixtures as production truth |
| P2/P3    | Test-only, emulator, docs, harmless UI placeholders                                                              |

## Findings (summary)

| Area                                  | Classification            | Notes                                                                                                            |
| ------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Portal magic token in browser storage | PASS / NO PERSISTENCE     | S7B audit: cookie session only                                                                                   |
| Portal authenticated APIs             | WORKING                   | Session + ownership gates (S1–S7)                                                                                |
| Stripe                                | WORKING in test/safe mode | Real charges forbidden in S8                                                                                     |
| Weather / AI empty keys               | NONCRITICAL               | Disabled without keys (env example documents no fake forecasts)                                                  |
| E2E against production URL            | NONCRITICAL_LIMITATION    | Skips emulator-only portal cases on remote host                                                                  |
| Format drift on clean RC              | P2 fixed                  | `format:changed` applied in worktree                                                                             |
| Hardcoded org business values         | REVIEW                    | Module presets/defaults expected; launch-block only if wrong customer pricing forced — none proven P0 in S8 scan |
| Secrets in git                        | PASS                      | No admin SDK JSON tracked; `.env.example` has public Firebase web config only                                    |

## Persistence requirement

Core CRM workflows must use Firestore via server/API — verified by existing integration/emulator suites (portal + prior P2 phases). No new P0 local-only save path identified for launch-critical flows in this scan.

## Secrets

- No `*adminsdk*.json` in worktree
- Do not commit `FIREBASE_SERVICE_ACCOUNT_KEY` values
- Rotate if any historical private key ever landed in git (not found in current RC tree)

**REAL PAYMENT TRANSACTIONS = 0** (S8)  
**REAL EMAIL = 0 / REAL SMS = 0** (S8)
