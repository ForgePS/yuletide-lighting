# Portal Phase 2 S7 — Compatibility Model

**ENVIRONMENT:** EMULATOR
**Production cutover:** NOT AUTHORIZED

## Goals

- Hash-only storage for **new** credentials without breaking existing plaintext links during emulator/staging validation.
- Session-first URLs (`/portal/app/**`) after magic-link exchange.
- Fail-closed on revocation, rotation, suspension, and duplicate hashes.

## Dual-read window

| Path                         | Behavior                                          |
| ---------------------------- | ------------------------------------------------- |
| Hash match                   | Always honored when account usable                |
| Legacy plaintext             | Only when `PORTAL_MAGIC_TOKEN_MODE=COMPATIBILITY` |
| Revoked + leftover plaintext | **DENY** — lifecycle checks before legacy         |
| Rotated + old plaintext      | **DENY** — hash mismatch blocks stale plaintext   |

## URL compatibility

- Legacy `/portal/{token}/...` remains an **entry shim** (`LegacyPortalEntryShim`).
- Successful POST `/api/portal/session` → `router.replace` to `/portal/app/...`.
- Authenticated UI uses tokenless nav (`portalAppPath`).

## Upgrade-on-read

**Disabled by default.** `portalMagicUpgradeOnReadAllowed()` requires emulator env + `PORTAL_MAGIC_TOKEN_UPGRADE_ON_READ=1`. Not used by `requirePortalAccess`.

## Cutover to HASH_ONLY

1. Emulator evidence: zero legacy lookups in telemetry.
2. Production migration plan approved separately (`portal-token-production-migration-plan.md`).
3. Set `PORTAL_MAGIC_TOKEN_MODE=HASH_ONLY` only after backfill/rotation gate.

**Gate status:** Compatibility paths implemented; production legacy usage metrics pending.
