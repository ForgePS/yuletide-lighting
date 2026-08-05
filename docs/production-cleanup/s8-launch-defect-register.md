# S8 Launch Defect Register

**PHASE:** PORTAL-P2-S8  
**DATE:** 2026-08-05  
**RELEASE BRANCH:** `release/yuletide-go-live-readiness`  
**BASE SHA:** `899b715d8c5067fce9fd345395c05025366a0a16`  
**ENVIRONMENT:** EMULATOR + CLI + staging rules deploy

| ID     | Severity | Workflow          | Description                                                                                                                                            | Launch blocking?                               | Workaround                                                        | Owner   | Post-launch        |
| ------ | -------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- | ----------------------------------------------------------------- | ------- | ------------------ |
| S8-001 | P1       | Hosting / nonprod | `firebase.json` `frameworksBackend.serviceAccount` references production SA `@yuletide-lighting.iam…` — verify before staging Hosting/Functions deploy | YES until verified nonprod-safe                | Deploy rules/indexes only first; block Hosting until SA confirmed | Release | Confirm staging SA |
| S8-002 | P2       | Toolchain         | Local Node v24 vs engines Node 20                                                                                                                      | NO                                             | Use Node 20 for RC CI/hosting                                     | Release | Align engines/CI   |
| S8-003 | P2       | Format gate       | Prettier drift on files since `p0.1` baseline required `format:changed` on clean RC worktree                                                           | NO (fixed in worktree)                         | Keep format gate green on RC commits                              | Release | —                  |
| S8-004 | P2       | E2E               | Default Playwright baseURL is production hosting; S7 launch-critical skips on non-localhost (S6 accounting)                                            | NO for local gate if emulator suite documented | Run portal emulator config locally for full portal E2E            | Release | Emulator CI job    |
| S8-005 | P3       | Docs              | `.env.example` includes production public Firebase web config                                                                                          | NO                                             | Public client keys expected; never commit Admin JSON              | Docs    | Optional scrub     |
| S8-006 | P2       | Staging Storage   | Staging Storage required console Get Started before rules deploy (API on, 0 buckets)                                                                   | NO (resolved 2026-08-05)                       | Bucket `yuletide-lighting-staging.firebasestorage.app`; rules PASS | Release | Done               |

**Open P0:** 0  
**Open launch-critical P1:** 1 (S8-001 Hosting SA)  
**Resolved this pass:** S8-006  
**Rule:** P0 = 0 and resolve/waive S8-001 before nonprod Hosting deploy and before READY_FOR_GO_LIVE_AUTHORIZATION.  
**Nonprod deploy progress:** Firestore rules+indexes + Storage rules deployed to `yuletide-lighting-staging` at SHA `414dbf9` (see `s8-nonprod-deploy-evidence.md`). Hosting not deployed.
