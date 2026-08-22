# Customer Portal Phase 2 security evidence

**ENVIRONMENT=EMULATOR**

| Control                   | Evidence in repository                                                                                                    | Status                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Identity binding          | Invitation claim verifies Firebase ID token in the API and server-assigns `authUserId`; invitation token stored as a hash | Implemented                                                                |
| Enumeration resistance    | Invitation/verification responses use a stable generic message                                                            | Implemented                                                                |
| OTP generation and limits | Six-digit generator, 10-minute TTL, five-attempt maximum, resend cooldown, timing-safe helpers                            | Implemented in helpers/QR flow                                             |
| OTP end-to-end login      | Dedicated non-QR portal login delivery and browser proof                                                                  | Remaining                                                                  |
| Dedicated session         | Signed `__portal_session`, 12-hour TTL, HttpOnly, SameSite=Lax, Secure outside local                                      | Implemented                                                                |
| Session invalidation      | Account/user status and `sessionVersion` checked against stored values                                                    | Implemented                                                                |
| Staff separation          | Portal cookie name/context are separate from staff `__session`                                                            | Implemented                                                                |
| Tenant/customer isolation | Token-derived server scope and emulator integration scenarios for key surfaces                                            | Implemented with coverage gaps                                             |
| Role/action authorization | Canonical fail-closed matrix and exhaustive unit matrix                                                                   | Implemented in resolver; remaining on public procedure boundary            |
| Feature authorization     | Enabled feature context and resolver checks                                                                               | Partial; procedure-level consistency remains                               |
| Public DTOs               | Explicit customer DTO sanitizer and customer-visible document/timeline filtering                                          | Implemented for audited surfaces; full DTO review remains                  |
| Secret handling           | Invitation hashes, QR hashes, structured metadata redaction                                                               | Implemented; legacy plaintext access token remains by compatibility design |
| Direct Firestore access   | Staff-only rules for portal/QR collections                                                                                | In repository; complete emulator rule evidence remains                     |
| Abuse/browser evidence    | Playwright, accessibility, responsive, CSRF-oriented mutation review                                                      | Remaining                                                                  |

## Evidence handling

Evidence must contain no raw token, OTP, cookie, invitation URL, secret, or real customer data. Test fixtures must remain synthetic.

**NO DEPLOYMENT:** implemented means present in code/repository tests, not verified in production.

## Emulator verification results

- Environment: ENVIRONMENT=EMULATOR; repository base c0cae35 plus uncommitted Phase 2 work.
- Unit: **113 passed**; portal integration: **73 passed**.
- Firebase rules: **15 passed**. Firestore coverage denies unauthenticated portal collection reads, protected identity/org/role/customer writes by a portal-role user, and suspended/revoked portal reads. Storage already denies unauthenticated org-path reads/writes.
- Storage rules do not inspect user status or role, so suspended/revoked Storage denial was not asserted; this remains a rules hardening gap.
- production:check --audits-only: **PASS**, 0 blockers, 2 non-blocking warnings.
- Status: **COMPLETE_WITH_LIMITATIONS**.

Remaining P1 gaps are the full Playwright suite, complete accessibility evidence, the full responsive matrix, session enforcement on every token procedure, and a production delivery adapter.
