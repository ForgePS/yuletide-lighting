# Portal Phase 2 S7 — Migration Evidence

**ENVIRONMENT:** EMULATOR  
**DATE:** 2026-08-03  
**S7A CHECKPOINT SHA:** `472c2479066a9591974588297059e7aec59f1b2e`  
**S7B Functional SHA:** `2661de3ab25f4d4b4db7bfcc79721bfa3374dc75`  
**Production migration:** NOT AUTHORIZED

## Stage checklist

| Stage | Description                                                                       | Status         | Evidence                                                                        |
| ----- | --------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------- |
| **A** | Baseline inventory + static audit                                                 | PASS (S7A)     | `portal-phase-2-s7-baseline.md`, `audit:portal-token-security`                  |
| **B** | Hash-only new writes (enable/rotate)                                              | PASS (S7A)     | `portal-phase2-s7.integration.test.ts` — hash-only enable                       |
| **C** | Dual-read COMPATIBILITY                                                           | PASS (S7A)     | Integration legacy plaintext PASS/DENY matrix                                   |
| **D** | Session-first cutover + hash backfill; `legacy_lookup_used = 0` under `HASH_ONLY` | **PASS (S7B)** | Integration `P2-S7B migration stages D–F`; telemetry counters                   |
| **E** | Remove plaintext; keep hash; idempotent `remove-plaintext`                        | **PASS (S7B)** | Integration clears fields; `scripts/portal-token-migration.mjs` idempotent skip |
| **F** | HASH_ONLY — original raw link → hash → session → tokenless destination            | **PASS (S7B)** | Same D–F integration case; `mapLegacyPortalPathToAppPath`                       |

## Stages D–F (emulator proof detail)

1. Synthetic plaintext-only fixture → backfill `accessTokenHash` (Stage D prep).
2. Set `HASH_ONLY`; resolve via hash; assert `portal.magic_token.legacy_lookup_used === 0`.
3. Clear plaintext fields (Stage E); retain hash.
4. Re-resolve original raw string via hash (Stage F); establish session; map legacy path to `/portal/app/...` without embedding raw token.

Implemented and gated in EMULATOR via `tests/integration/portal/portal-phase2-s7.integration.test.ts` (committed in S7B `2661de3`). See closeout: `portal-phase-2-s7b-closeout-reconciliation.md`.

## Commands (regression)

```bash
npm run audit:portal-token-security
npm test -- packages/firebase/src/portal-phase2-s7-magic-access.test.ts
npm run test:integration
```

## Production blockers (unchanged)

- Separate production migration authorization required
- Tool exits: `PRODUCTION_PORTAL_TOKEN_MIGRATION_NOT_AUTHORIZED` (no bypass)
- Legacy lookup telemetry at zero for agreed window before production HASH_ONLY
- Rollback drill on staging clone

**NO PRODUCTION FIREBASE. NO DEPLOY.** P2-S8 requires separate authorization after S7B closeout PASS.
