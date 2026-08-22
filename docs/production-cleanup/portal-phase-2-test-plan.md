# Customer Portal Phase 2 test plan

**ENVIRONMENT=EMULATOR**

| Layer           | Target                                                       | Status / required evidence                                                                                                                                                                                       |
| --------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit            | `packages/firebase/src/portal-phase2-security.test.ts`       | Implemented: fail-closed permissions, token/session crypto, expiry, OTP shape/rate limiting, normalization, and redaction. Record a fresh passing run before completion.                                         |
| Integration     | `tests/integration/portal/portal-phase2.integration.test.ts` | Implemented for tenant/customer isolation, lifecycle, invitations, sessions, roles, feature gates, and DTO redaction. Some assertions are broad and should be strengthened. Record a fresh emulator run.         |
| Firestore rules | Existing Firebase rules suite                                | Add/confirm portal account/user/timeline/notification and all QR collection deny/allow cases; verify no unauthenticated direct client access.                                                                    |
| API integration | `/api/portal/session` and `portal360.public`                 | Test cookie flags, create/get/delete, invalid/expired/version-invalidated sessions, token fallback, and role/action denial.                                                                                      |
| E2E             | Planned Playwright portal suite                              | Run only against emulator-backed local web: invite/claim, magic-link compatibility, logout, suspension, role navigation and denied actions, cross-customer URL tampering, QR/OTP, and core routes. Not complete. |
| Accessibility   | Automated + manual                                           | See `portal-phase-2-accessibility.md`; incomplete.                                                                                                                                                               |
| Responsive      | Required phase viewports                                     | See `portal-phase-2-responsive.md`; incomplete.                                                                                                                                                                  |

## Safety requirements

- Use `.invalid` fixture addresses and synthetic customers only.
- Never print or retain raw tokens, OTPs, cookies, or invitation links in evidence.
- Fail if emulator host variables are absent.
- Do not target a real Firebase project.

**NO DEPLOYMENT / NO PRODUCTION WRITES.**
