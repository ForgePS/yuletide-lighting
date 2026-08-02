# Portal Phase 2 S7 — Migration Design

**ENVIRONMENT:** EMULATOR
**Production execution:** PROHIBITED

## Scope

Move all magic-access credentials to hash-only at rest while preserving session-first UX. Production backfill is a **separate authorized program** — this design covers emulator tooling and guards only.

## Tooling

| Artifact                                  | Role                                                               |
| ----------------------------------------- | ------------------------------------------------------------------ |
| `scripts/portal-token-migration.mjs`      | Emulator-only batch hash/rotate simulation                         |
| `scripts/audit-portal-token-security.mjs` | Static gate: resolver wiring, hash-only writes, staff DTO, headers |
| `assertEmulatorPortalTokenMigration()`    | Runtime guard — throws without emulator host                       |

## Migration stages (emulator)

1. **Inventory** — `portal-phase-2-s7-token-inventory.md`, audit scripts.
2. **Dual-write hash** — new enables/rotates already hash-only (S7 code).
3. **Dual-read** — `resolvePortalMagicAccess` COMPATIBILITY mode.
4. **Session cutover** — `/portal/app/**` namespace (S7 routes).
5. **Legacy field cleanup** — clear `accessToken` / `portalToken` on verified paths.
6. **HASH_ONLY** — disable legacy lookup via env.

## Non-goals (S7)

- No production Firestore reads/writes.
- No `--allow-production` migration bypass.
- No hashing of tokens from exported CSVs without rotation.

## Rollback

See `portal-phase-2-s7-rollback.md`. Revert S7 branch; COMPATIBILITY mode restores legacy reads if plaintext fields still exist.

**Gate status:** Design documented; live migration evidence pending gate runs.
