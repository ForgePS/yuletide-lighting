# Portal Phase 2 S7 — Test Plan

**ENVIRONMENT:** EMULATOR
**S6 docs SHA:** `d98c3e90715e4a7e104285a68ea16cc56811c30b`

## Unit

**File:** `packages/firebase/src/portal-phase2-s7-magic-access.test.ts`

| Suite           | Coverage                                                   |
| --------------- | ---------------------------------------------------------- |
| Generation      | URL-safe entropy, no Math.random                           |
| Hashing         | Deterministic `v1:` format, invalid input, unknown version |
| Write fields    | Hash-only, fingerprint length                              |
| Mode            | COMPATIBILITY vs HASH_ONLY                                 |
| Migration guard | `assertEmulatorPortalTokenMigration` without emulator      |
| Equality        | `magicAccessHashesEqual`, fingerprint 8 hex                |

## Integration

**File:** `tests/integration/portal/portal-phase2-s7.integration.test.ts`

| Describe         | Assertions                                                |
| ---------------- | --------------------------------------------------------- |
| Hash-only enable | `accessTokenHash` set; `accessToken` / `portalToken` null |
| Hash auth        | `requirePortalAccess` PASS                                |
| Legacy compat    | PASS in COMPATIBILITY; DENY in HASH_ONLY                  |
| Rotation         | Old DENY; new PASS; hash-only; sessionVersion bump        |
| Revocation       | Stale plaintext cannot bypass                             |
| Suspension       | DENY                                                      |
| Duplicate hash   | `resolvePortalMagicAccess` null                           |
| Session          | Exchange + dashboard via sessionToken only                |
| Route auth       | `/portal/app/billing` + session allowed                   |
| Staff DTO        | No raw token; `accessUrl` null                            |
| Cross-tenant     | Tenant A token cannot mutate B invoice                    |

**Setup:** Real firebase helpers; `PORTAL_MAGIC_TOKEN_MODE` restored after each test.

## E2E

**File:** `e2e/portal-phase2-s7-token-hardening.spec.ts`

| Test                                  | Skip when                     |
| ------------------------------------- | ----------------------------- |
| Invalid entry shim denial             | NOT localhost emulator target |
| `/portal/app/billing` without session | NOT localhost                 |
| Session POST bogus → 401 + no-store   | NOT localhost                 |
| Session DELETE                        | NOT localhost                 |

All four annotated `launch-critical: portal-token-hardening` — **must not skip on emulator** (0 portal launch-critical skips).

Full magic-link → `/portal/app` redirect: **integration** (seeded tokens); noted in E2E file header.

## Static

| Command                               | Purpose        |
| ------------------------------------- | -------------- |
| `npm run audit:portal-token-security` | S7 static gate |

## Gates (parent)

| Gate             | Notes                                                                      |
| ---------------- | -------------------------------------------------------------------------- |
| Unit             | Focused vitest on S7 magic-access file                                     |
| Integration      | Requires Firestore emulator                                                |
| E2E              | `playwright.portal-emulator.config.ts`; portal launch-critical skipped = 0 |
| production:check | ×3 consecutive — parent only                                               |

**Results:** pending gate run — do not claim PASS here.
