# Customer Portal Phase 2 defect register

**ENVIRONMENT=EMULATOR**  
**Aligned with:** P2-S0 baseline (`portal-phase-2-s0-baseline.md`) gap IDs S0-G01…G10

| ID     | Severity | Defect / gap                                                                                                                                        | Evidence                             | Exit condition                                        | Status                     |
| ------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------- | -------------------------- |
| P2-001 | P2       | Magic tokens remain in URLs for compatibility; session cookie is established and preferred when present (S2). Full token removal is a later cutover | S2 complete                          | Authorized token URL removal after backfill/audit     | Open (compatibility)       |
| P2-002 | P1       | Production invitation/OTP delivery adapter not implemented (emulator adapters only)                                                                 | invitation + portal-qr360            | Approved delivery adapter with anti-enumeration proof | Open                       |
| P2-003 | P2       | Storage rules lack portal status/role denial (Firestore portal coverage expanded)                                                                   | storage.rules / tests                | Storage portal status denial or documented accept     | Open                       |
| P2-004 | P1       | Authenticated emulator Playwright suite not fully executed in this snapshot (specs authored)                                                        | `e2e/portal-phase2-security.spec.ts` | Suite passes against local Next + emulators           | Open                       |
| P2-005 | P2       | WCAG 2.2 AA automated/manual audit incomplete                                                                                                       | accessibility plan                   | Audit complete; serious/critical closed               | Open                       |
| P2-006 | P2       | Full responsive viewport matrix incomplete                                                                                                          | responsive plan                      | All brief viewports validated on critical routes      | Open                       |
| P2-007 | P2       | Some integration assertions are still broad                                                                                                         | portal-phase2.integration.test.ts    | Deterministic include/exclude proofs                  | Open                       |
| P2-008 | P2       | Legacy plaintext URL token dual-write remains                                                                                                       | compatibility plan                   | Approved cutover                                      | Accepted for compatibility |

New defects must include reproduction steps using synthetic emulator data, affected role/feature, security impact, owner, and retest evidence. Never record raw credentials or customer data.

**NO DEPLOYMENT / NO PRODUCTION WRITES.**
