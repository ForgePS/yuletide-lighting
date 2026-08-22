# YL-S24 Plan — Node / Functions runtime upgrade (BACKLOG-009)

## Objective

HARDEN toolchain for Firebase Hosting frameworksBackend (Next.js SSR Cloud Function): leave Node 20 before **2026-10-30** decommission by pinning **Node 22** in engines/CI/deploy guidance—without production deploy.

## Authorization

User authorized YL-S24. No production deploy.

## Deliverables

1. **Runtime policy helpers** — target major `22`, runtime id `nodejs22`, decommission dates; unit-tested
2. **Pin engines to 22** — root + `apps/web` (+ sync christmas-light-crm engines/.nvmrc)
3. **CI + local pin** — GitHub Actions `node-version: 22`; root `.nvmrc`
4. **Deploy script guard** — warn when local Node major ≠ policy target (was “>20 → use 20”)
5. **Docs** — BACKLOG-009 PARTIAL (config ready; live Functions redeploy deferred)

## Out of Scope

- Production / staging Firebase deploy (redeploy applies runtime)
- Node 24 jump (optional later; 22 is LTS-aligned target through 2027-10-31)
- Breaking Expo/mobile engine changes beyond monorepo root pin
