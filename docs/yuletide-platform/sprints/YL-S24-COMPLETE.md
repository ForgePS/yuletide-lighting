# YL-S24 Complete — Node / Functions runtime upgrade

**STATUS:** COMPLETE  
**VERDICT:** PASS  
**Date:** 2026-08-13  

## Scope completed

1. **Runtime policy helpers** — Node 22 / `nodejs22` pin; nodejs20 decommission `2026-10-30`; mismatch messaging
2. **Engines pin** — root + `apps/web` (+ christmas-light-crm) `engines.node: "22"`; root `.nvmrc`
3. **CI** — GitHub Actions `node-version: 22`
4. **Deploy guard** — `deploy-firebase.mjs` warns unless Node major is 22; `npm run check:node-runtime`
5. **Unit tests** — policy parse/satisfy/mismatch/days-until

## Verification

| Check | Result |
|-------|--------|
| Unit `npm test` | **PASS** 315/315 |
| Production deploy | **NONE** (runtime applies on next Hosting/SSR deploy) |

## Deferred

- Live Firebase Hosting/SSR redeploy to apply `nodejs22` in GCP
- Node 24 optional later jump
- Enforce `--strict` in CI if desired

## Next sprint

**NOT AUTHORIZED.**
