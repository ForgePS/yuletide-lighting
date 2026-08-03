# Portal Phase 2 S7 — Migration Evidence

**ENVIRONMENT:** EMULATOR  
**DATE:** 2026-08-03  
**S7A CHECKPOINT SHA:** `472c2479066a9591974588297059e7aec59f1b2e`  
**Production migration:** NOT AUTHORIZED

## Stage checklist

| Stage | Description                                                                                                                                      | Status                              | Evidence                                                                                                                           |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **A** | Baseline inventory + static audit                                                                                                                | S7A foundation                      | `portal-phase-2-s7-baseline.md`, `audit:portal-token-security`                                                                     |
| **B** | Hash-only new writes (enable/rotate)                                                                                                             | S7A                                 | `portal-phase2-s7.integration.test.ts` — hash-only enable                                                                          |
| **C** | Dual-read COMPATIBILITY                                                                                                                          | S7A                                 | Integration legacy plaintext PASS/DENY matrix                                                                                      |
| **D** | Session-first URL cutover + hash backfill (keep plaintext temporarily); prove `legacy_lookup_used = 0` under `HASH_ONLY`                         | Emulator intent / integration suite | Route cutover map; `getPortalMagicTelemetryCounts` / `resetPortalMagicTelemetryCounts`; S7B describe `P2-S7B migration stages D–F` |
| **E** | Remove plaintext fields (`accessToken` / `customers.portalToken`); keep hash; `remove-plaintext` idempotent (writes only when plaintext present) | Emulator intent / integration suite | `scripts/portal-token-migration.mjs remove-plaintext`; production hard-block                                                       |
| **F** | HASH_ONLY end state — original raw link still authenticates via hash → session → tokenless destination                                           | Emulator intent / integration suite | `PORTAL_MAGIC_TOKEN_MODE=HASH_ONLY`; map to `/portal/app/...` without raw in destination                                           |

## Stages D–F emulator intent (detail)

1. Synthetic plaintext-only fixture → backfill `accessTokenHash` (Stage D prep).
2. Set `HASH_ONLY`; resolve via hash; assert `portal.magic_token.legacy_lookup_used === 0`.
3. Clear plaintext fields (Stage E); retain hash.
4. Re-resolve original raw string via hash (Stage F); establish session; map legacy path to `/portal/app/...` without embedding raw token.

Formal parent-gate PASS columns remain **pending** until S7B full gate run. Do not invent PASS for incomplete ops runs.

## Commands (parent gate)

```bash
npm run audit:portal-token-security
npm test -- packages/firebase/src/portal-phase2-s7-magic-access.test.ts
npm run test:integration -- portal-phase2-s7
```

## Production blockers

- Separate production migration authorization required
- Tool exits: `PRODUCTION_PORTAL_TOKEN_MIGRATION_NOT_AUTHORIZED` (no bypass)
- Legacy lookup telemetry at zero for agreed window before production HASH_ONLY
- Rollback drill on staging clone

**NO PRODUCTION FIREBASE. NO DEPLOY. DO NOT START P2-S8.**
