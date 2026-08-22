# Customer Portal Phase 2 — Implementation Plan

**Checkpoint origin:** P2-S0
**Branch:** `production/yuletide-cleanup-launch-readiness`
**ENVIRONMENT:** EMULATOR until separately authorized
**Deployment:** PROHIBITED until program gate opens
**Base HEAD at S0:** `c0cae35a23f96cf3dc08c6f98842c04777775853`

Do not redesign UI. Do not add unrelated portal features. Preserve token/OTP/QR/magic-link compatibility until an authorized cutover checkpoint.

Reuse existing Phase 2 primitives where present; **finish wiring and enforcement** rather than rewriting.

---

## Checkpoint sequence

| Checkpoint | Title                                                      | Exit criteria (summary)                                                                                                                            |
| ---------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P2-S0**  | Baseline, security audit, plan                             | This plan + verified inventories — **DONE**                                                                                                        |
| **P2-S1**  | Identity model + permission resolver enforcement           | All public mutations + sensitive reads call `requirePortalAuthorized`; role matrix tests green — **DONE** (`portal-phase-2-s1-completion.md`)      |
| **P2-S2**  | Session architecture + lifecycle invalidation              | `__portal_session` first-class; UI establish/logout; lifecycle invalidation; staff/portal isolation — **DONE** (`portal-phase-2-s2-completion.md`) |
| **P2-S3**  | Invitation claim + OTP hardening                           | **IN_PROGRESS** — claim UI, hashed invite, atomic claim, OTP controls, emulator-only delivery, docs/static gates                                   |
| **P2-S4**  | Query + DTO audit closeout                                 | **COMPLETE** — static gates, allowlist serializers, maps/docs, and 142-case emulator suite (`portal-phase-2-s4-completion.md`)                     |
| **P2-S5**  | Route authorization + file access tickets                  | **COMPLETE** — route/file tickets, audits wired, 54-case S5 integration + gate evidence (portal-phase-2-s5-completion.md)                          |
| **P2-S6**  | Emulator integration (≥60) + rules + Storage               | **COMPLETE** — mutation/idempotency, payment safe mode, integration + E2E evidence                                                                 |
| **P2-S7**  | Magic-token hardening + session-first URLs                 | **IN_PROGRESS** — hash-only writes, `/portal/app/**`, compatibility modes; gate pending                                                            |
| **P2-S8**  | Playwright + a11y + responsive                             | Authenticated emulator E2E; WCAG AA critical paths; viewport matrix                                                                                |
| **P2-S8**  | production:check gates + deployment package (prepare-only) | Gates block missing isolation/DTO/OTP/session tests; deployment plan ready; **still no deploy**                                                    |
| **P2-S9**  | Completion report                                          | `portal-phase-2-completion.md` with evidence; recommendation READY or RETURN                                                                       |

Each checkpoint must record `ENVIRONMENT=EMULATOR` and refuse production writes.

---

## P2-S1 — Permission enforcement (next)

### Goal

Make `resolvePortalPermission` the authoritative backend gate for portal actions.

### Work

1. Add `requirePortalAuthorized({ token | session, feature, action })` in `portal360.ts` that:
   - resolves access via token **or** verified portal session
   - loads account + acting `PortalUser` (not always primary owner for multi-user later)
   - calls `assertPortalUserAction`
2. Apply to every public mutation and to reads that expose billing/signing/messages/documents.
3. Keep fail-closed for suspended/revoked/locked/invited users.
4. Expand unit tests: every role × supported action for critical features.

### Do not

- Change stable role keys
- Trust client-supplied role / org / customer / features

### Tests

- Unit matrix (already started in `portal-phase2-security.test.ts`)
- Integration: view_only denied on create; billing_contact pay allowed / service create denied

---

## P2-S2 — Portal session

### Goal

Dedicated portal session becomes a first-class access path alongside magic token (compatibility).

### Work

1. After successful token access / OTP verify / claim, call `/api/portal/session` or set cookie server-side.
2. Portal loaders/tRPC context: accept session cookie **or** token; prefer session when both present.
3. Ensure `invalidatePortalSessions` on suspend, revoke, rotate, role change, logout-all.
4. Reject portal session on staff procedures; reject staff `__session` on portal-only procedures.
5. Document final cookie decision in `portal-phase-2-session-design.md` (already drafted — update with verification results).

### Compatibility

- Magic URL tokens remain valid during Phase 2.
- Dual-write `customers.portalToken` retained until authorized removal.

---

## P2-S3 — Invitation + OTP

**Status:** IN_PROGRESS
**Environment:** EMULATOR

### Goal

Secure invite → verify → bind `authUserId` → session, without enumeration.

### Work

1. Staff: keep `inviteUser` / `revokeInvitation`; ensure token returned once; never log.
2. Customer claim path: minimal page or deepen `/portal/access` / login — **no redesign**, smallest path.
3. OTP: shared helpers only; resend cooldown; per-token/email/IP limits where supported; generic errors.
4. Emulator delivery adapters only; no production email/SMS from this phase.

### S3 deliverables

- Baseline/maps; invitation, OTP, rate-limit, test, accessibility, evidence, and rollback documents.
- Hashed invitation lifecycle with transactional claim and `/portal/invite/[token]`.
- Hashed, purpose-bound OTP with TTL, attempts, cooldown, replacement invalidation, and rate limits.
- Static auth-security, permission, and session audits wired into `production:check`.
- Legacy plaintext magic-token migration documented and explicitly deferred.

---

## P2-S4 — Query + DTO closeout

**Status:** IN_PROGRESS — implementation complete; emulator/static command results pending.

### Goal

Every portal data path customer-scoped; public DTOs allowlisted.

### Work

1. Replace org-wide fallbacks with explicit errors or ensure indexes exist in emulator tests.
2. Allowlist serializers for remaining list DTOs (invoice, proposal, job, message, document, etc.).
3. Stop returning raw `accessToken` in dashboard body where avoidable (compatibility may keep URL token).
4. Document results in `portal-phase-2-query-audit.md`.

### S4 evidence

`audit:portal-query-scope` and `audit:portal-public-dtos` are wired after the existing portal audits. `portal-phase2-s4.integration.test.ts` covers list isolation, DTO poisoning, generic job not-found, server-derived scope, and payment/signing token separation. No production action is authorized.

---

## P2-S5 — Route authorization and file tickets

**Status:** IN_PROGRESS
**Environment:** EMULATOR

### Goal

Canonical route map, server-side route authorization, and ticketed file access without permanent Storage URLs.

### Work

1. `PORTAL_ROUTE_DEFINITIONS` + `requirePortalRouteAccess` / `authorizePortalPath` (S1+S2+S4 composition).
2. `createPortalFileAccess` with 15-minute TTL; `/api/portal/files` streaming (`private, no-store`).
3. Ticket cutover for `listPortalDocuments`, `listPortalAgreements`, `uploadPortalPhoto`.
4. Static audits `audit-portal-routes.mjs`, `audit-portal-files.mjs`; S5 docs and gate evidence.
5. Nav filter remains UX-only; API and deep links fail closed.

---

## P2-S6 — Emulator tests + rules

### Goal

≥60 meaningful integration scenarios; Firestore/Storage rules coverage for portal security fields.

### Work

1. Harden `tests/integration/portal/portal-phase2.integration.test.ts` assertions (deterministic seeds).
2. Expand rules: portal user cannot read token/OTP hashes / cannot patch role/org/customer.
3. Storage: cross-tenant/customer denial; unauthorized upload (as rules allow).

---

## P2-S7 — Playwright / a11y / responsive

### Goal

Browser evidence on **local** Next + emulators only.

### Work

1. Run `playwright.portal-emulator.config.ts` with `E2E_BASE_URL=http://127.0.0.1:3000`.
2. Cover: magic link, OTP, claim, session refresh/logout, feature nav, role denial, invalid/expired tokens.
3. Viewport matrix + WCAG critical routes per existing a11y/responsive docs.

---

## P2-S8 — Gates + prepare-only deploy package

### Goal

`production:check` blocks Phase 2 security regressions; deployment plan prepared **without deploying**.

### Work

1. Extend `scripts/production-check.mjs` portal audits (already started).
2. Finalize `portal-phase-2-deployment-plan.md` (no staging project invention).

---

## P2-S9 — Completion

### Goal

Honest completion report: READY FOR DEPLOYMENT REVIEW or RETURN FOR CORRECTION.

Requires: no open P0; no open security P1; emulator evidence complete; production writes = 0.

---

## Suggested file ownership (no redesign)

| Area           | Primary files                                                                                |
| -------------- | -------------------------------------------------------------------------------------------- |
| Permissions    | `packages/types/src/portal-permissions.ts`, `portal360.ts`                                   |
| Session        | `portal-session.ts`, `apps/web/src/app/api/portal/session/route.ts`, portal pages/shell      |
| Invitation/OTP | `portal-invitation.ts`, `portal-qr360.ts`, minimal claim/login wiring                        |
| API            | `packages/api/src/routers/portal360.ts`                                                      |
| Tests          | `portal-phase2-security.test.ts`, `tests/integration/portal/*`, `e2e/portal-phase2*.spec.ts` |
| Docs           | `docs/production-cleanup/portal-phase-2-*.md`                                                |

---

## Immediate next action

Complete **P2-S3** emulator commands and record evidence before changing status from IN_PROGRESS. Do not start deployment or production migration work.

**NO DEPLOYMENT. NO PRODUCTION WRITES.**

### P2-S6 status note (2026-08-02)

S6 scope executed as transaction integrity + idempotency + provider-safe checkout (see portal-phase-2-s6-completion.md). Emulator integration expanded beyond legacy portal-phase2.integration.test.ts with dedicated S6 suite.
