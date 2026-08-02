# Portal Phase 2 S7 — Migration Evidence

**ENVIRONMENT:** EMULATOR
**Production migration:** NOT AUTHORIZED

## Stage checklist

| Stage | Description                          | Status           | Evidence                                                       |
| ----- | ------------------------------------ | ---------------- | -------------------------------------------------------------- |
| **A** | Baseline inventory + static audit    | pending gate run | `portal-phase-2-s7-baseline.md`, `audit:portal-token-security` |
| **B** | Hash-only new writes (enable/rotate) | pending gate run | `portal-phase2-s7.integration.test.ts` — hash-only enable      |
| **C** | Dual-read COMPATIBILITY              | pending gate run | Integration legacy plaintext PASS/DENY matrix                  |
| **D** | Session-first URL cutover            | pending gate run | `portal-phase-2-s7-route-cutover-map.md`, E2E S7 spec          |
| **E** | Legacy field cleanup simulation      | pending gate run | `scripts/portal-token-migration.mjs` emulator run log          |
| **F** | HASH_ONLY mode verification          | pending gate run | Integration `PORTAL_MAGIC_TOKEN_MODE=HASH_ONLY` cases          |

## Commands (parent gate)

```bash
npm run audit:portal-token-security
npm test -- packages/firebase/src/portal-phase2-s7-magic-access.test.ts
npm run test:integration -- portal-phase2-s7
```

## Production blockers

- [ ] Separate production migration authorization
- [ ] Legacy lookup telemetry at zero for N days
- [ ] Rollback drill on staging clone

**Do not record PASS until parent gate completes.**
