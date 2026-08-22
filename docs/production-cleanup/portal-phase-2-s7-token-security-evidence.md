# Portal Phase 2 S7A — Token Security Evidence

**ENVIRONMENT:** EMULATOR  
**DATE:** 2026-08-02  
**CHECKPOINT:** PORTAL-P2-S7A  
**Production Firebase / deploy:** PROHIBITED

## Gates run (S7A)

| Gate                        | Result                            |
| --------------------------- | --------------------------------- |
| format:changed:check        | PASS                              |
| lint                        | PASS                              |
| typecheck                   | PASS                              |
| unit (`npm test`)           | PASS — 214                        |
| test:integration            | PASS (includes S7/S7A suite — 15) |
| test:firebase-rules         | PASS — 18                         |
| audit:portal-permissions    | PASS                              |
| audit:portal-sessions       | PASS                              |
| audit:portal-auth-security  | PASS                              |
| audit:portal-query-scope    | PASS                              |
| audit:portal-public-dtos    | PASS                              |
| audit:portal-routes         | PASS                              |
| audit:portal-files          | PASS                              |
| audit:portal-mutations      | PASS                              |
| audit:portal-idempotency    | PASS                              |
| audit:portal-token-security | PASS                              |
| build                       | PASS                              |
| production:check:audits     | PASS (10 portal audits)           |

## Evidence highlights

- Hash domain `portal-magic-access` ≠ invitation/otp domains (unit)
- New enable/rotate: `accessTokenHash` present, `accessToken` null, `portalToken` null (integration)
- Legacy COMPATIBILITY / HASH_ONLY modes (integration)
- Duplicate hash DENY (integration)
- Session valid with plaintext fields absent (integration S7A)
- Dashboard / getAccount / getCustomerPortalAccess no raw credential (integration + audit)
- QR activation does not write `portalToken: accessToken` (static audit)
- Migration tool production guard string present (static audit)

## Not claimed

- Production token migration
- HASH_ONLY production cutover
- Full S7 / S7B complete
