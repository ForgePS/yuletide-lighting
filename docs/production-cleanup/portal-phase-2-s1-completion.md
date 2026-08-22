# Customer Portal Phase 2 — Checkpoint P2-S1

**Phase:** PORTAL-P2-S1  
**Title:** Canonical Portal Permission Enforcement  
**Status:** COMPLETE  
**Date:** 2026-07-31  
**Branch:** `production/yuletide-cleanup-launch-readiness`  
**Baseline HEAD:** `c0cae35a23f96cf3dc08c6f98842c04777775853`  
**ENVIRONMENT:** EMULATOR  
**Production writes:** 0  
**Deployment:** NO

---

## Mission

Make `resolvePortalPermission` the authoritative backend gate for public portal actions, fail-closed, without redesigning the portal UI or removing magic-token compatibility.

## Delivered

| Item                                                                                         | Status                                         |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `requirePortalAuthorized({ token \| sessionToken, feature, action, settingsAllows? })`       | Done — `packages/firebase/src/portal360.ts`    |
| `PortalActionNotPermittedError` / `PortalFeatureNotEnabledError` / `PortalAccessDeniedError` | Done                                           |
| Wired on **28** public portal handlers (reads + mutations)                                   | Done                                           |
| Session token path accepted (optional; primary remains magic token until S2)                 | Done                                           |
| Acting user from server-resolved `PortalUser` (not client-selected)                          | Done                                           |
| tRPC maps permission/feature denials to `FORBIDDEN` with public codes                        | Done — `packages/api/src/routers/portal360.ts` |
| Unit coverage for critical role × action matrix                                              | Done — `portal-phase2-s1-permissions.test.ts`  |
| Integration: view_only / billing_contact / property_contact API enforcement                  | Done — 78 portal integration tests PASS        |

## Handler → feature / action (summary)

| Surface                                                                                                                                      | Feature               | Action                             |
| -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ---------------------------------- |
| Dashboard, timeline, notifications, contacts                                                                                                 | `dashboard`           | `view`                             |
| Service list / create / photo upload                                                                                                         | `service_requests`    | `view` / `create`                  |
| Messages                                                                                                                                     | `messaging`           | `view` / `message`                 |
| Billing invoices                                                                                                                             | `billing`             | `view` (+ settings `viewInvoices`) |
| Proposals / agreements / documents / storage / mockups / jobs / consultations / takedowns / reviews / referrals / rebook / schedule / e-sign | matching feature keys | `view` or `request` as appropriate |

## Tests (ENVIRONMENT=EMULATOR)

| Suite                                                        | Result        |
| ------------------------------------------------------------ | ------------- |
| `portal-phase2-s1-permissions.test.ts` + security unit       | **70 passed** |
| `tests/integration/portal/portal-phase2.integration.test.ts` | **78 passed** |
| Firebase / API typecheck                                     | **PASS**      |

## Explicitly out of S1 (deferred)

- Portal UI consuming `__portal_session` as primary boundary → **P2-S2**
- Invitation claim UI → **P2-S3**
- Plaintext token hashing / dashboard enumeration hardening → later checkpoints
- Org-wide query fallback removal → **P2-S4**
- Deploy / production writes → **prohibited**

## Acceptance

| Criterion                                                                                              | Met |
| ------------------------------------------------------------------------------------------------------ | --- |
| All public mutations + sensitive reads call permission gate                                            | YES |
| Fail-closed unknown / disabled / suspended / role denial                                               | YES |
| Role matrix tests green                                                                                | YES |
| Integration: view_only denied create/message; billing denied service create; billing can view invoices | YES |
| No production write / no deploy                                                                        | YES |

**P2-S1 STATUS: COMPLETE**  
**Next:** P2-S2 — Portal session architecture + lifecycle invalidation
