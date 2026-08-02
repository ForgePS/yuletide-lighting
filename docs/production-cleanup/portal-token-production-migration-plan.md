# Portal Token — Production Migration Plan (DOCS ONLY)

**STATUS:** NOT AUTHORIZED
**ENVIRONMENT:** Planning document — **no production Firebase access**

This plan describes a future production cutover. **S7 emulator work does not authorize any step below.**

## Preconditions

- [ ] S7 emulator gates PASS (integration, E2E, static audits, production:check ×3)
- [ ] Security review sign-off
- [ ] Customer comms template for link rotation
- [ ] Rollback drill on staging clone
- [ ] Backup verified within 24h of migration window

## Phases (production — when authorized)

### Phase 1 — Observe (read-only)

- Export inventory: accounts with `accessToken`, `customers.portalToken`, missing `accessTokenHash`
- Enable sanitized telemetry (`portal.magic_token.legacy_lookup_used`) — no raw tokens in logs

### Phase 2 — Dual-write (deploy S7 code, COMPATIBILITY mode)

- Deploy application with hash-only **new** writes
- `PORTAL_MAGIC_TOKEN_MODE=COMPATIBILITY`
- Monitor legacy lookup rate

### Phase 3 — Backfill via rotation (not hash-in-place)

- For each account with legacy plaintext only: **rotate** magic link, email customer, clear plaintext fields transactionally
- Never derive stored hash from leaked/exported raw tokens without rotation

### Phase 4 — Session-first URLs

- Confirm `/portal/app/**` live; marketing materials updated to prefer login + session

### Phase 5 — HASH_ONLY

- Set `PORTAL_MAGIC_TOKEN_MODE=HASH_ONLY` when legacy lookups = 0 for agreed window
- Remove legacy indexes/queries after verification period

### Phase 6 — Field removal

- Drop `accessToken`, `customers.portalToken` columns after backup + rollback window

## Explicit prohibitions

- No production migration from developer laptops without `assertEmulatorPortalTokenMigration`-equivalent ops runbook
- No `--force-production` flags
- No hashing tokens from database dumps without rotation

## Success criteria

- Zero plaintext magic tokens at rest
- Zero legacy lookup telemetry for 7 days
- Portal launch-critical E2E green on production-like staging

**Authorization record:** _empty — fill when program approves production execution_
