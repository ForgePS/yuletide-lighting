# Portal Phase 2 S7 — Token Security Evidence

**ENVIRONMENT:** EMULATOR
**Production:** NO CONTACT

## Static audits

| Audit          | Script                                    | Expected                                              |
| -------------- | ----------------------------------------- | ----------------------------------------------------- |
| Token security | `scripts/audit-portal-token-security.mjs` | PASS — resolver, hash-only writes, staff DTO, headers |
| Portal routes  | `scripts/audit-portal-routes.mjs`         | PASS — `/portal/app` namespace                        |

## Automated tests

| Layer       | File                                       | Coverage                                                                                                 |
| ----------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Unit        | `portal-phase2-s7-magic-access.test.ts`    | Hash, mode, migration guard, fingerprint                                                                 |
| Integration | `portal-phase2-s7.integration.test.ts`     | Hash auth, legacy modes, rotate/revoke/suspend, duplicate hash, session, routes, staff DTO, cross-tenant |
| E2E         | `portal-phase2-s7-token-hardening.spec.ts` | Entry shim denial, session-only routes, session API hardening                                            |

## Security properties (target)

- [ ] No plaintext persistence on new writes
- [ ] Revoked/suspended deny legacy bypass
- [ ] Duplicate hash fail-closed
- [ ] Staff never receives raw token from reads
- [ ] Legacy token URLs: `Referrer-Policy: no-referrer`, `Cache-Control: no-store`, `noindex`
- [ ] Session API POST: `Cache-Control: no-store`

## Gate results

| Gate           | Run date         | Result |
| -------------- | ---------------- | ------ |
| Static audit   | pending gate run | —      |
| Unit           | pending gate run | —      |
| Integration    | pending gate run | —      |
| E2E (emulator) | pending gate run | —      |

**Parent agent fills PASS/FAIL after consecutive production:check runs.**
