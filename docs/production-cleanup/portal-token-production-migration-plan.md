# Portal Token — Production Migration Plan (DOCS ONLY)

**STATUS:** NOT AUTHORIZED  
**ENVIRONMENT:** Planning document — **no production Firebase access**  
**DATE:** 2026-08-03  
**Related:** PORTAL-P2-S7B emulator proof (does **not** authorize any step below)

This plan describes a future production cutover. **S7 / S7B emulator work does not authorize any step below.**

## Preconditions

- [ ] S7A + S7B emulator gates PASS (integration, E2E, static audits, production:check ×3, post-commit)
- [ ] Security review sign-off
- [ ] Customer comms template for link rotation (if rotation path chosen)
- [ ] Rollback drill on staging clone
- [ ] Backup verified within 24h of migration window

## Emulator-proven production sequence (§77)

Future production migration must follow this order. Each production step requires **separate** authorization:

1. Deploy hash-read/hash-write compatibility code.
2. Verify runtime.
3. Separately authorize production read-only inventory.
4. Separately authorize tokenHash backfill.
5. Measure legacy fallback usage (`portal.magic_token.legacy_lookup_used`).
6. Prove zero plaintext dependency.
7. Separately authorize plaintext-field removal.
8. Disable legacy plaintext lookup (`HASH_ONLY` / equivalent).
9. Monitor.

## Explicit prohibitions

- No production migration from developer laptops without ops-authorized runbook
- No `--force-production` / `--allow-production` flags
- Tooling must return `PRODUCTION_PORTAL_TOKEN_MIGRATION_NOT_AUTHORIZED` and exit nonzero without emulator host
- No hashing tokens from database dumps without an approved rotation/backfill program
- S7B does not inventory, backfill, remove, or rotate production credentials

## Success criteria

- Zero plaintext magic tokens at rest (after authorized Phase 7+)
- Zero legacy lookup telemetry for agreed window
- Portal launch-critical E2E green on production-like staging
- Session-first `/portal/app/**` preferred for authenticated use

## Authorization record

_empty — fill when program approves production execution_

**NO PRODUCTION FIREBASE CONTACT FROM S7B. NO DEPLOY. DO NOT START P2-S8.**
