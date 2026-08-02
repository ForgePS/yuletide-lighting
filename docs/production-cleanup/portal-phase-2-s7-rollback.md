# Portal Phase 2 S7 — Rollback

**ENVIRONMENT:** EMULATOR — no deployment performed.

## Code rollback

Revert S7 commits on `work/portal-p2-s7-token-hardening` touching:

| Area               | Paths                                                                   |
| ------------------ | ----------------------------------------------------------------------- |
| Magic access       | `packages/firebase/src/portal-magic-access.ts`                          |
| Portal360 wiring   | `packages/firebase/src/portal360.ts`                                    |
| Route namespace    | `packages/firebase/src/portal-route-access.ts`                          |
| Session exchange   | `packages/firebase/src/portal-session.ts`                               |
| Web routes         | `apps/web/src/app/portal/app/**`, `portal/[token]/**`                   |
| Entry shim         | `apps/web/src/lib/portal-token-entry.tsx`, `portal-paths.ts`            |
| Shell nav          | `apps/web/src/components/portal/portal-shell.tsx`                       |
| Headers            | `apps/web/next.config.js`, `portal/[token]/layout.tsx`                  |
| Audits / migration | `scripts/audit-portal-token-security.mjs`, `portal-token-migration.mjs` |
| Tests              | `portal-phase2-s7*.test.ts`, `portal-phase2-s7*.spec.ts`                |
| Docs               | `docs/production-cleanup/portal-phase-2-s7-*`                           |

**Preserve S6 functional SHA:** `b7f2cc1edadfd4351f70e5b3682ac561751369eb`.

## Config rollback

| Env                                    | Rollback                      |
| -------------------------------------- | ----------------------------- |
| `PORTAL_MAGIC_TOKEN_MODE=HASH_ONLY`    | Remove or set `COMPATIBILITY` |
| `PORTAL_MAGIC_TOKEN_UPGRADE_ON_READ=1` | Unset                         |

## Data rollback

- Emulator seeds only; delete test orgs or reset emulator.
- Hash-only accounts without plaintext backup require **rotate** to issue new links — document customer comms if rollback after partial production cutover (not authorized in S7).

## Forward fix (preferred)

| Issue                               | Mitigation                                             |
| ----------------------------------- | ------------------------------------------------------ |
| Legacy links broken after HASH_ONLY | Re-enable COMPATIBILITY; ensure plaintext fields exist |
| Duplicate hash blocked              | Manual ops review; re-hash one account                 |
| Session cutover confusion           | Direct users to `/portal/login` or re-send magic link  |

**Production impact:** None until S7 is deployed and authorized separately.
