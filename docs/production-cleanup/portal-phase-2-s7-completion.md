# Portal Phase 2 S7 — Completion

**PHASE:** PORTAL-P2-S7  
**TITLE:** Legacy Magic-Token Hardening, Hash-Only Storage, and Session-First URL Cutover  
**STATUS:** COMPLETE  
**DATE:** 2026-08-03  
**S7A SHA:** `472c2479066a9591974588297059e7aec59f1b2e`  
**S7B SHA:** `2661de3ab25f4d4b4db7bfcc79721bfa3374dc75`  
**ENVIRONMENT:** EMULATOR

## CREDENTIAL STORAGE

- New credentials hash-only: YES
- New plaintext writes: 0
- Canonical hash helper: `hashPortalAccessToken` / domain `portal-magic-access`
- Raw token DTO exposure: removed (staff views + dashboard)

## COMPATIBILITY

- Legacy plaintext resolver: COMPATIBILITY mode only
- Production compatibility retained until separately authorized HASH_ONLY
- Upgrade-on-read: dual-field backfill path in migration tooling
- Legacy fallback telemetry: `portal.magic_token.legacy_lookup_used` (+ in-memory counters)

## SESSION

- Magic credential required after session creation: NO
- Portal account resolved directly from session: YES
- sessionVersion: enforced
- Staff/portal separation: YES

## URL CUTOVER

- Canonical tokenless namespace: `/portal/app/*`
- Legacy token routes: entry/deep-link shims only
- Final authenticated URL: tokenless
- Internal navigation: tokenless (`portalAppPath`)
- Deep links: exchange → replace → tokenless
- Browser storage: no raw magic token

## MIGRATION SIMULATION

- Hash backfill: PASS (emulator tooling + tests)
- Zero plaintext dependency: PASS (`legacy_lookup_used = 0`)
- Plaintext removal: PASS (idempotent)
- Hash-only operation: PASS
- Original links remain valid: PASS
- Duplicate/conflict protection: FAIL CLOSED

## SECURITY

- Token logging: redacted
- Referrer: no-referrer on entry
- Cache: no-store on entry/session
- Indexing: noindex on entry
- Analytics: NOT APPLICABLE
- Error monitoring: NOT APPLICABLE

## ROTATION / REVOCATION

- Rotation hash-only: YES
- Old token denied: YES
- Old sessions denied: YES (sessionVersion)
- Revocation: YES
- Legacy bypass: NO in HASH_ONLY

## QR

- New magic credential hash-only: YES
- Activation behavior: preserved
- Plaintext writes: 0

## TESTS

- Unit / Integration / Rules / 10 portal audits / Build: PASS
- E2E: S6-pattern emulator-host accounting; exchange proven in integration
- production:check ×3: recorded after gate
- Post-commit check: after S7B commit

## DEFECTS

- P0: 0
- P1: 0
- P2: 0 remaining for S7 scope

## DEFERRED

- Authorized production token inventory
- Authorized production hash backfill
- Authorized production plaintext removal
- Production fallback disablement
- Real nonproduction Firebase validation
- Firebase rules/index deployment
- Production deployment

## PRODUCTION FIREBASE READS: 0

## PRODUCTION WRITES: 0

## PRODUCTION TOKEN MIGRATIONS: 0

## DEPLOYMENT: NO

## RECOMMENDATION

**PROCEED TO PORTAL-P2-S8** after S7B SHA is committed and post-commit verification PASS.
